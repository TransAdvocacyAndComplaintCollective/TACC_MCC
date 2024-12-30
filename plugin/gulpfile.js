const gulp = require('gulp');
const rename = require('gulp-rename');
const del = require('del');

const paths = {
  src: 'src/**/*',
  manifestChrome: 'src/manifest.chrome.json',
  manifestFirefox: 'src/manifest.firefox.json',
  distChrome: 'dist/chrome/',
  distFirefox: 'dist/firefox/',
};

// Clean output directories
function clean() {
  return del(['dist/**', '!dist']);
}

// Copy source files to Chrome directory
function copyChrome() {
  return gulp.src([paths.src, `!${paths.manifestFirefox}`])
    .pipe(rename((path) => {
      if (path.basename === 'manifest.chrome') {
        path.basename = 'manifest';
      }
    }))
    .pipe(gulp.dest(paths.distChrome));
}

// Copy source files to Firefox directory
function copyFirefox() {
  return gulp.src([paths.src, `!${paths.manifestChrome}`])
    .pipe(rename((path) => {
      if (path.basename === 'manifest.firefox') {
        path.basename = 'manifest';
      }
    }))
    .pipe(gulp.dest(paths.distFirefox));
}

// Define complex tasks
const build = gulp.series(clean, gulp.parallel(copyChrome, copyFirefox));

// Export tasks
exports.clean = clean;
exports.copyChrome = copyChrome;
exports.copyFirefox = copyFirefox;
exports.build = build;
