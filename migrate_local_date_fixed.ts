import { db, pool } from './server/db';
import { meals } from './shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Improved migration script to populate the localDate field on existing meals
 * This fixes the date format issue
 */
async function migrateMeals() {
  console.log("Starting improved migration of meal localDate fields...");
  
  // Get all meals from the database
  const allMeals = await db.select().from(meals);
  
  console.log(`Found ${allMeals.length} meals to migrate`);
  let updatedCount = 0;
  
  // Process each meal
  for (const meal of allMeals) {
    try {
      // If timestamp is available, use it
      if (meal.timestamp) {
        const timestamp = new Date(meal.timestamp);
        
        // Format the date as YYYY-MM-DD
        const year = timestamp.getFullYear();
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Create a date at noon to avoid timezone issues
        const localDate = new Date(`${dateStr}T12:00:00.000Z`);
        
        console.log(`Meal ${meal.id}: Original timestamp: ${timestamp.toISOString()}, Local date: ${localDate.toISOString()}`);
        
        // Update the meal with the new localDate
        await db
          .update(meals)
          .set({ localDate })
          .where(eq(meals.id, meal.id));
        
        console.log(`Updated meal ${meal.id} with localDate: ${localDate.toISOString()}`);
        updatedCount++;
      } else {
        console.log(`Meal ${meal.id} has no timestamp, skipping`);
      }
    } catch (error) {
      console.error(`Error updating meal ${meal.id}:`, error);
    }
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