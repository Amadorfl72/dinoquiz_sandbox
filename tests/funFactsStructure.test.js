const questions = require('../src/data/questions.json').questions;

// Test to ensure all fun_fact image_paths are unique
function testFunFactImagePathsUnique() {
  const imagePaths = questions.map(q => q.image_path);
  const uniqueImagePaths = new Set(imagePaths);
  if (uniqueImagePaths.size === imagePaths.length) {
    console.log('Test passed: All fun_fact image_paths are unique.');
  } else {
    console.error('Test failed: Duplicate fun_fact image_paths found.');
  }
}

testFunFactImagePathsUnique();