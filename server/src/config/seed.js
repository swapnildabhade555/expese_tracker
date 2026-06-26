import prisma from './db.js';

const defaultCategories = [
  'Food & Dining',
  'Shopping',
  'Utilities & Bills',
  'Transportation',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Others',
];

export const seedDefaultCategories = async () => {
  try {
    console.log('Checking database default categories...');
    
    // Find how many default categories are already in database
    const existingCount = await prisma.category.count({
      where: { isDefault: true },
    });

    if (existingCount === 0) {
      console.log('No default categories found. Seeding default categories...');
      
      const seedData = defaultCategories.map((name) => ({
        name,
        isDefault: true,
        userId: null,
      }));

      await prisma.category.createMany({
        data: seedData,
      });

      console.log(`✅ Successfully seeded ${defaultCategories.length} default categories.`);
    } else {
      console.log('Default categories already exist. Skipping seed.');
    }
  } catch (error) {
    console.error('❌ Failed to seed default categories:', error);
  }
};
