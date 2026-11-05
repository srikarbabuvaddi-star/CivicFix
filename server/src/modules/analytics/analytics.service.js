import mongoose from 'mongoose';
import { Issue } from '../issues/issue.model.js';
import { Feedback } from '../feedback/feedback.model.js';
import { Department } from '../departments/department.model.js';
import { ISSUE_STATUS, ISSUE_VISIBILITY } from '../../config/constants.js';

/**
 * Citizen operational telemetry: strictly isolated to the requesting citizen
 */
export async function getCitizenAnalytics(citizenId) {
  const citizenObjectId = new mongoose.Types.ObjectId(citizenId);

  const [statusAgg, totalCount, resolvedCount, avgFeedbackAgg] = await Promise.all([
    // Group citizen's issues by status
    Issue.aggregate([
      { $match: { reporterId: citizenObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Total reports submitted
    Issue.countDocuments({ reporterId: citizenObjectId }),
    // Total resolved or closed
    Issue.countDocuments({
      reporterId: citizenObjectId,
      status: { $in: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED] }
    }),
    // Average rating given by this citizen
    Feedback.aggregate([
      { $match: { citizenId: citizenObjectId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ])
  ]);

  const statusBreakdown = {};
  for (const item of statusAgg) {
    statusBreakdown[item._id] = item.count;
  }

  const avgRating = avgFeedbackAgg.length > 0 && avgFeedbackAgg[0].avgRating
    ? Math.round(avgFeedbackAgg[0].avgRating * 10) / 10
    : null;

  return {
    totalReports: totalCount,
    resolvedReports: resolvedCount,
    statusBreakdown,
    feedbackGivenCount: avgFeedbackAgg.length > 0 ? avgFeedbackAgg[0].count : 0,
    averageSatisfactionRating: avgRating
  };
}

/**
 * Staff technician workload analytics: strictly scoped to assigned work orders
 */
export async function getStaffAnalytics(staffUserId) {
  const staffObjectId = new mongoose.Types.ObjectId(staffUserId);

  const [statusAgg, totalAssigned, completedCount, resolutionTimesAgg] = await Promise.all([
    Issue.aggregate([
      { $match: { assigneeId: staffObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Issue.countDocuments({ assigneeId: staffObjectId }),
    Issue.countDocuments({
      assigneeId: staffObjectId,
      status: { $in: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED] }
    }),
    // Calculate average resolution duration in hours where resolvedAt exists
    Issue.aggregate([
      {
        $match: {
          assigneeId: staffObjectId,
          resolvedAt: { $ne: null }
        }
      },
      {
        $project: {
          durationHours: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$durationHours' }
        }
      }
    ])
  ]);

  const statusBreakdown = {};
  for (const item of statusAgg) {
    statusBreakdown[item._id] = item.count;
  }

  const avgResolutionHours = resolutionTimesAgg.length > 0 && resolutionTimesAgg[0].avgDuration
    ? Math.round(resolutionTimesAgg[0].avgDuration * 10) / 10
    : null;

  return {
    totalAssignedWorkOrders: totalAssigned,
    completedResolutions: completedCount,
    activeWorkOrders: totalAssigned - completedCount,
    statusBreakdown,
    averageResolutionHours: avgResolutionHours
  };
}

/**
 * Administrative city-wide analytics: requires Admin authorization
 */
export async function getAdminAnalytics() {
  const [
    totalIssues,
    statusAgg,
    categoryAgg,
    departmentAgg,
    resolutionStatsAgg,
    feedbackRatingAgg,
    departmentsList
  ] = await Promise.all([
    // Total non-withdrawn issues
    Issue.countDocuments({ status: { $ne: ISSUE_STATUS.WITHDRAWN } }),
    // By status
    Issue.aggregate([
      { $match: { status: { $ne: ISSUE_STATUS.WITHDRAWN } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // By category
    Issue.aggregate([
      { $match: { status: { $ne: ISSUE_STATUS.WITHDRAWN } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    // By department
    Issue.aggregate([
      {
        $match: {
          departmentId: { $ne: null },
          status: { $ne: ISSUE_STATUS.WITHDRAWN }
        }
      },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ]),
    // Average resolution time in hours
    Issue.aggregate([
      {
        $match: {
          resolvedAt: { $ne: null }
        }
      },
      {
        $project: {
          durationHours: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$durationHours' },
          count: { $sum: 1 }
        }
      }
    ]),
    // Overall feedback rating
    Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      }
    ]),
    Department.find({}).select('name').exec()
  ]);

  const deptMap = {};
  for (const d of departmentsList) {
    deptMap[d._id.toString()] = d.name;
  }

  const statusBreakdown = {};
  for (const s of statusAgg) {
    statusBreakdown[s._id] = s.count;
  }

  const categoryBreakdown = {};
  for (const c of categoryAgg) {
    categoryBreakdown[c._id] = c.count;
  }

  const departmentWorkload = departmentAgg.map((item) => ({
    departmentId: item._id,
    departmentName: deptMap[item._id.toString()] || 'Unassigned',
    ticketCount: item.count
  }));

  const resolvedTotal = (statusBreakdown[ISSUE_STATUS.RESOLVED] || 0) + (statusBreakdown[ISSUE_STATUS.CLOSED] || 0);
  const resolutionRate = totalIssues > 0
    ? Math.round((resolvedTotal / totalIssues) * 1000) / 10
    : 0;

  const avgResolutionHours = resolutionStatsAgg.length > 0 && resolutionStatsAgg[0].avgHours
    ? Math.round(resolutionStatsAgg[0].avgHours * 10) / 10
    : null;

  const avgCitizenRating = feedbackRatingAgg.length > 0 && feedbackRatingAgg[0].avgRating
    ? Math.round(feedbackRatingAgg[0].avgRating * 10) / 10
    : null;

  return {
    totalIssues,
    resolutionRatePercent: resolutionRate,
    averageResolutionHours: avgResolutionHours,
    averageCitizenRating: avgCitizenRating,
    totalFeedbackCount: feedbackRatingAgg.length > 0 ? feedbackRatingAgg[0].totalFeedback : 0,
    statusBreakdown,
    categoryBreakdown,
    departmentWorkload
  };
}

/**
 * Geographic hotspot clusters aggregated from public issues with minimum threshold privacy policy
 */
export async function getGeographicHotspots({ minThreshold = 2, category = null } = {}) {
  const matchStage = {
    visibility: ISSUE_VISIBILITY.PUBLIC,
    status: { $ne: ISSUE_STATUS.WITHDRAWN },
    'location.coordinates': { $exists: true, $ne: [] }
  };

  if (category) {
    matchStage.category = category;
  }

  // Aggregate by grid cell (coordinates rounded to 2 decimals ~1.1km)
  const hotspots = await Issue.aggregate([
    { $match: matchStage },
    {
      $project: {
        category: 1,
        gridLng: {
          $divide: [
            { $round: [{ $multiply: [{ $arrayElemAt: ['$location.coordinates', 0] }, 100] }] },
            100
          ]
        },
        gridLat: {
          $divide: [
            { $round: [{ $multiply: [{ $arrayElemAt: ['$location.coordinates', 1] }, 100] }] },
            100
          ]
        }
      }
    },
    {
      $group: {
        _id: { lng: '$gridLng', lat: '$gridLat' },
        count: { $sum: 1 },
        categories: { $push: '$category' }
      }
    },
    // Enforce privacy threshold: do not return single isolated points
    { $match: { count: { $gte: minThreshold } } },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);

  return hotspots.map((h) => {
    // Determine top category in cluster
    const catCounts = {};
    for (const c of h.categories) {
      catCounts[c] = (catCounts[c] || 0) + 1;
    }
    const topCategory = Object.keys(catCounts).reduce((a, b) => (catCounts[a] > catCounts[b] ? a : b), 'other');

    return {
      coordinates: [h._id.lng, h._id.lat], // [longitude, latitude]
      count: h.count,
      primaryCategory: topCategory
    };
  });
}

