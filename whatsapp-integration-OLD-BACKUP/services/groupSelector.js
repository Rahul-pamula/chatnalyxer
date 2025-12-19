import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SELECTED_GROUPS_FILE = 'selected-groups.json';

// Load previously selected groups
export function loadSelectedGroups() {
  try {
    if (fs.existsSync(SELECTED_GROUPS_FILE)) {
      const data = fs.readFileSync(SELECTED_GROUPS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Error loading selected groups:', error.message);
  }
  return {};
}

// Save selected groups to file
export function saveSelectedGroups(selectedGroups) {
  try {
    fs.writeFileSync(SELECTED_GROUPS_FILE, JSON.stringify(selectedGroups, null, 2));
    console.log('✅ Selected groups saved successfully');
  } catch (error) {
    console.error('❌ Error saving selected groups:', error.message);
  }
}

// Interactive group selection in terminal
export async function selectGroupsInteractively(groups) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📋 Available WhatsApp Groups:');
  console.log('═'.repeat(50));

  groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.name}`);
  });

  console.log('═'.repeat(50));
  console.log('📝 Enter group numbers to analyze (comma-separated):');
  console.log('💡 Example: 1,3,5 or type "all" for all groups');

  return new Promise((resolve) => {
    rl.question('Your selection: ', (answer) => {
      rl.close();

      const selectedGroups = {};

      if (answer.toLowerCase().trim() === 'all') {
        // Select all groups
        groups.forEach(group => {
          selectedGroups[group.id._serialized] = {
            name: group.name,
            selected: true,
            addedAt: new Date().toISOString()
          };
        });
        console.log('✅ All groups selected for analysis');
      } else {
        // Parse selected numbers
        const selections = answer.split(',')
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n) && n > 0 && n <= groups.length);

        if (selections.length === 0) {
          console.log('⚠️ No valid selections made. No groups will be analyzed.');
          resolve({});
          return;
        }

        selections.forEach(num => {
          const group = groups[num - 1];
          selectedGroups[group.id._serialized] = {
            name: group.name,
            selected: true,
            addedAt: new Date().toISOString()
          };
        });

        console.log(`✅ Selected ${selections.length} groups for analysis:`);
        selections.forEach(num => {
          console.log(`   - ${groups[num - 1].name}`);
        });
      }

      saveSelectedGroups(selectedGroups);
      resolve(selectedGroups);
    });
  });
}

// Check if a group should be analyzed
export function shouldAnalyzeGroup(groupId, selectedGroups) {
  return selectedGroups[groupId]?.selected === true;
}

// Get list of selected group names
export function getSelectedGroupNames(selectedGroups) {
  return Object.values(selectedGroups)
    .filter(group => group.selected)
    .map(group => group.name);
}