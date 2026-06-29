import prisma from './db.js';

const defaultCategories = [
  { name: 'Food & Dining', icon: '🍔' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Utilities & Bills', icon: '💡' },
  { name: 'Transportation', icon: '🚗' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Health & Fitness', icon: '💪' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Others', icon: '📦' },
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
      
      const seedData = defaultCategories.map(({ name, icon }) => ({
        name,
        icon,
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
