import { connectDB, disconnectDB } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { User } from '../modules/users/user.model.js';
import { Department } from '../modules/departments/department.model.js';
import { ROLES } from '../config/constants.js';

async function seed() {
  console.log('\n[CivicFix] Seeding Development & Evaluation Data...');
  await connectDB();

  // 1. Departments
  const departmentsData = [
    {
      name: 'Roads & Infrastructure Department',
      normalizedName: 'roads & infrastructure department',
      description: 'Maintains public roadways, sidewalks, potholes, and pedestrian infrastructure.',
      categoriesHandled: ['roads'],
      serviceArea: 'Municipality-Wide',
      isActive: true
    },
    {
      name: 'Sanitation & Solid Waste Management',
      normalizedName: 'sanitation & solid waste management',
      description: 'Responsible for public garbage collection, roadside debris, and waste management.',
      categoriesHandled: ['waste'],
      serviceArea: 'Municipality-Wide',
      isActive: true
    },
    {
      name: 'Electrical & Street Lighting Directorate',
      normalizedName: 'electrical & street lighting directorate',
      description: 'Maintains streetlights, public lighting grids, and exposed electrical conduits.',
      categoriesHandled: ['streetlight'],
      serviceArea: 'Municipality-Wide',
      isActive: true
    },
    {
      name: 'Water Supply & Sewerage Board',
      normalizedName: 'water supply & sewerage board',
      description: 'Manages municipal drinking water distribution, pipe leaks, drainage, and sewer lines.',
      categoriesHandled: ['water', 'drainage'],
      serviceArea: 'Municipality-Wide',
      isActive: true
    }
  ];

  for (const dept of departmentsData) {
    const existing = await Department.findOne({ normalizedName: dept.normalizedName });
    if (!existing) {
      await Department.create(dept);
      console.log(`+ Created Department: ${dept.name}`);
    }
  }

  const waterDept = await Department.findOne({ normalizedName: 'water supply & sewerage board' });

  // 2. Demo Users
  const demoUsers = [
    {
      name: 'Aditi Rao',
      email: 'citizen@civicfix.org',
      password: 'CitizenPassword123!',
      role: ROLES.CITIZEN,
      status: 'active'
    },
    {
      name: 'Officer Sarah Blake',
      email: 'staff@civicfix.gov',
      password: 'StaffPassword123!',
      role: ROLES.STAFF,
      status: 'active',
      departmentId: waterDept?._id
    },
    {
      name: 'Civic Administrator',
      email: 'admin@civicfix.gov',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      status: 'active'
    }
  ];

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    const passwordHash = await hashPassword(u.password);
    if (!existing) {
      await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        status: u.status,
        departmentId: u.departmentId
      });
      console.log(`+ Created Demo User [${u.role}]: ${u.email}`);
    } else {
      existing.passwordHash = passwordHash;
      if (u.departmentId && !existing.departmentId) {
        existing.departmentId = u.departmentId;
      }
      await existing.save();
      console.log(`✓ Updated Demo User [${u.role}]: ${u.email}`);
    }
  }

  console.log('\n[CivicFix] Seeding completed successfully.');
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[CivicFix] Seeding error:', err);
  process.exit(1);
});
