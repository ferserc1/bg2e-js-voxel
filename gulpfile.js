const gulp = require('gulp');
const concat = require('gulp-concat');
const replace = require('gulp-replace');
const connect = require('gulp-connect');
const path = require('path');
const fs = require('fs');

let config = {
    outDir: 'build/'
};

function getFiles(dir,fileExt,filelist) {
	let fs = require('fs'),
	files = fs.readdirSync(dir);
	filelist = filelist || [];
	if (!Array.isArray(fileExt)) {
		fileExt = [fileExt];
	}
	files.forEach(function(file) {
		let ext = file.split('.').pop();
		if (fs.statSync(dir + '/' + file).isDirectory() && file!='deps') {
			filelist = getFiles(dir + file + '/', fileExt, filelist);
		}
		else if (fileExt.indexOf(ext)!=-1) {
			filelist.push(dir + file);
		}
	});
	return filelist;
}

function addSample(sampleName) {
    gulp.src(`examples/${sampleName}/index.html`)
        .pipe(gulp.dest(`${config.outDir}/examples/${sampleName}`));

    gulp.src(`examples/${sampleName}/*.js`)
        .pipe(concat(`${sampleName}.js`))
        .pipe(gulp.dest(`${config.outDir}/examples/${sampleName}`));
}

gulp.task("library", function() {
    let files = getFiles("src/","js");
    return gulp.src(files)
        .pipe(concat("bg2e-voxel.js"))
        .pipe(gulp.dest(`${config.outDir}/js/`));
});

gulp.task("samples", function() {
    let sampleString = "";
    fs.readdirSync('examples')
        .filter(function(file) {
            return fs.statSync(path.join('examples',file)).isDirectory();
        })
        .forEach(function(sample) {
            sampleString += "\n" +
                `       <li><a href="examples/${sample}/index.html">${sample}</a></li>`;
            addSample(sample);
        });
    
    gulp.src('index.html')
        .pipe(replace("{{ samples }}",sampleString))
        .pipe(gulp.dest(`${config.outDir}/`));
    
    gulp.src('node_modules/bg2e-js/js/bg2e-es2015.js')
        .pipe(gulp.dest(`${config.outDir}/js/`));
    
    gulp.src('data/**')
        .pipe(gulp.dest(`${config.outDir}/examples/data`));
});

gulp.task("build",gulp.parallel("library","samples"));

gulp.task("webserver",function() {
    connect.server({
        name:"bg2e voxel",
        root:config.outDir,
        port:8090
    });
});

function watchFiles() {
    gulp.watch([
        './index.html',
        './src/**',
        './examples/**'
    ],gulp.series("build"));
}

gulp.task("serve",gulp.parallel("build","webserver",watchFiles));