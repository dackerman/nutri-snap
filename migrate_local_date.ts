import { db, pool } from './server/db';
import { meals } from './shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Migration script to populate the localDate field on existing meals
 * This converts from the timestamp to a clean date-only field
 */
async function migrateMeals() {
  console.log("Starting migration of meal localDate fields...");
  
  // Get all meals from the database
  const allMeals = await db.select().from(meals);
  
  console.log(`Found ${allMeals.length} meals to migrate`);
  let updatedCount = 0;
  
  // Process each meal
  for (const meal of allMeals) {
    // Skip meals that already have a localDate
    if (meal.localDate) {
      console.log(`Meal ${meal.id} already has localDate: ${meal.localDate}`);
      continue;
    }
    
    // Extract the date portion from the timestamp
    const timestamp = new Date(meal.timestamp);
    const localDate = new Date(timestamp.toISOString().split('T')[0]);
    
    // Update the meal with the new localDate
    await db
      .update(meals)
      .set({ localDate })
      .where(eq(meals.id, meal.id));
    
    console.log(`Updated meal ${meal.id} with localDate: ${localDate.toISOString()}`);
    updatedCount++;
  }
  
  console.log(`Migration complete. Updated ${updatedCount} meals.`);
  
  // Close the database connection when done
  await pool.end();
}

// Run the migration
migrateMeals().catch(error => {
  console.error("Migration error:", error);
  process.exit(1);
});