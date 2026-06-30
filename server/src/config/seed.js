import prisma from './db.js';

const defaultCategories = [
  { name: 'Food & Dining', icon: '🍔' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Utilities & Bills', icon: '💡' },
  { name: 'Transportation', icon: '🚗' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Health & Fitness', icon: '💪' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Rent', icon: '🏠' },
  { name: 'EMI', icon: '💳' },
  { name: 'Maintenance', icon: '🔧' },
  { name: 'Subscription', icon: '📱' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Others', icon: '📦' },
];

export const seedDefaultCategories = async () => {
  try {
    console.log('Checking database default categories...');
    
    let seededCount = 0;
    for (const cat of defaultCategories) {
      const existing = await prisma.category.findFirst({
        where: {
          name: cat.name,
          isDefault: true,
          userId: null,
        },
      });

      if (!existing) {
        await prisma.category.create({
          data: {
            name: cat.name,
            icon: cat.icon,
            isDefault: true,
            userId: null,
          },
        });
        seededCount++;
      }
    }

    if (seededCount > 0) {
      console.log(`✅ Successfully seeded ${seededCount} new default categories.`);
    } else {
      console.log('All default categories are already seeded.');
    }
  } catch (error) {
    console.error('❌ Failed to seed default categories:', error);
  }
};
