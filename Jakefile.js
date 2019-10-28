var build = require('./build/build.js')
var version = require('./package.json').version

function hint(msg, args) {
    return function () {
        console.log(msg);
        jake.exec('node node_modules/eslint/bin/eslint.js ' + args,
            { printStdout: true }, function () {
                console.log('\tCheck passed.\n');
                complete();
            });
    };
}

desc('Check Leaflet.draw source for errors with ESHint');
task('lint', { async: true }, hint('Checking for JS errors...', 'src'));

desc('Combine and compress Leaflet Draw source files');
task('build', { async: true }, function (compsBase32, buildName) {
    build.build(complete, version, compsBase32, buildName);
});

task('default', ['lint', 'build']);

jake.addListener('complete', function () {
    process.exit();
});