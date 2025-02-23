var fs = require('fs'),
    UglifyJS = require('uglify-js'),
    zlib = require('zlib'),
    SourceNode = require('source-map').SourceNode,
    UglifyCss = require('uglifycss');

deps = require('./deps.js').deps;

function getFiles(compsBase32) {
    var memo = {},
        comps;

    if (compsBase32) {
        comps = parseInt(compsBase32, 32).toString(2).split('');
        console.log('Managing dependencies...');
    }

    function addFiles(srcs) {
        for (var j = 0, len = srcs.length; j < len; j++) {
            memo[srcs[j]] = true;
        }
    }

    for (var i in deps) {
        if (comps) {
            if (parseInt(comps.pop(), 2) === 1) {
                console.log(' * ' + i);
                addFiles(deps[i].src);
            } else {
                console.log('   ' + i);
            }
        } else {
            addFiles(deps[i].src);
        }
    }

    console.log('');

    var files = [];

    for (var src in memo) {
        files.push('src/' + src);
    }

    return files;
}

function getSizeDelta(newContent, oldContent, fixCRLF) {
    if (!oldContent) {
        return ' (new)';
    }
    if (newContent === oldContent) {
        return ' (unchanged)';
    }
    if (fixCRLF) {
        newContent = newContent.replace(/\r\n?/g, '\n');
        oldContent = oldContent.replace(/\r\n?/g, '\n');
    }
    var delta = newContent.length - oldContent.length;

    return delta === 0 ? '' : ' (' + (delta > 0 ? '+' : '') + delta + ' bytes)';
}

function loadSilently(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (e) {
        return null;
    }
}

function bundleFiles(files, copy, version) {
    var node = new SourceNode(null, null, null, '');

    node.add(new SourceNode(null, null, null, copy + '(function (window, document, undefined) {'));

    for (var i = 0, len = files.length; i < len; i++) {
        var contents = fs.readFileSync(files[i], 'utf8');

        if (files[i] === 'src/Leaflet.draw.js') {
            contents = contents.replace(
                new RegExp('drawVersion = \'.*\''),
                'drawVersion = ' + JSON.stringify(version)
            );
        }

        var lines = contents.split('\n');
        var lineCount = lines.length;
        var fileNode = new SourceNode(null, null, null, '');

        fileNode.setSourceContent(files[i], contents);

        for (var j = 0; j < lineCount; j++) {
            fileNode.add(new SourceNode(j + 1, 0, files[i], lines[j] + '\n'));
        }
        node.add(fileNode);

        node.add(new SourceNode(null, null, null, '\n\n'));
    }

    node.add(new SourceNode(null, null, null, '}(window, document));'));

    var bundle = node.toStringWithSourceMap();
    return {
        src: bundle.code,
        srcmap: bundle.map.toString()
    };
}

function bytesToKB(bytes) {
    return (bytes / 1024).toFixed(2) + ' KB';
}

function build (callback, version, compsBase32, buildName) {

    var files = getFiles(compsBase32);

    console.log('Bundling and compressing ' + files.length + ' files...');

    var copy = '',
        filenamePart = 'leaflet.draw' + (buildName ? '-' + buildName : ''),
        pathPart = 'dist/' + filenamePart,
        srcPath = pathPart + '-src.js',
        mapPath = pathPart + '-src.map',
        srcFilename = filenamePart + '-src.js',
        mapFilename = filenamePart + '-src.map',

        bundle = bundleFiles(files, copy, version),
        newSrc = bundle.src + '\n//# sourceMappingURL=' + mapFilename,

        oldSrc = loadSilently(srcPath),
        srcDelta = getSizeDelta(newSrc, oldSrc, true),

        leafletDrawCssPath = './src/leaflet.draw.css',
        compressedCssPath = './dist/leaflet.draw.css',
        cssSource = loadSilently(leafletDrawCssPath),
        oldCompressedCss = loadSilently(compressedCssPath),
        cssSourcePath = './dist/leaflet.draw-src.css',
        newCompressedCss;

    try {
        newCompressedCss = UglifyCss.processFiles(
            [leafletDrawCssPath],
            { maxLineLen: 500, expandVars: true }
        )
    } catch (e) {
        console.error('UglifyCss failed to minify the files');
        console.error(err);
        callback(err);
    }

    var cssSrcDelta = getSizeDelta(newCompressedCss, oldCompressedCss, true);

    console.log('\tCompressed Css: ' + bytesToKB(newCompressedCss.length) + cssSrcDelta);
    try {
        if (newCompressedCss !== oldCompressedCss) {
            fs.writeFileSync(cssSourcePath, cssSource);
            fs.writeFileSync(compressedCssPath, newCompressedCss);
            console.log('\tSaved to ' + srcPath);
        }
    } catch (err) {
        console.error('UglifyCSS failed to minify the files');
        console.error(err);
        callback(err);
    }

    console.log('\tUncompressed Js: ' + bytesToKB(newSrc.length) + srcDelta);
    if (newSrc !== oldSrc) {
        fs.writeFileSync(srcPath, newSrc);
        fs.writeFileSync(mapPath, bundle.srcmap);
        console.log('\tSaved to ' + srcPath);
    }

    var path = pathPart + '.js',
        oldCompressed = loadSilently(path),
        newCompressed;

    try {
        newCompressed = copy + UglifyJS.minify(newSrc, {
            warnings: true,
            fromString: true
        }).code;
    } catch (err) {
        console.error('UglifyJS failed to minify the files');
        console.error(err);
        callback(err);
    }

    var delta = getSizeDelta(newCompressed, oldCompressed);

    console.log('\tCompressed: ' + bytesToKB(newCompressed.length) + delta);

    var newGzipped,
        gzippedDelta = '';

    function done() {
        if (newCompressed !== oldCompressed) {
            fs.writeFileSync(path, newCompressed);
            console.log('\tSaved to ' + path);
        }
        console.log('\tGzipped: ' + bytesToKB(newGzipped.length) + gzippedDelta);
        callback();
    }

    zlib.gzip(newCompressed, function (err, gzipped) {
        if (err) {
            return;
        }
        newGzipped = gzipped;
        if (oldCompressed && (oldCompressed !== newCompressed)) {
            zlib.gzip(oldCompressed, function (err, oldGzipped) {
                if (err) {
                    return;
                }
                gzippedDelta = getSizeDelta(gzipped, oldGzipped);
                done();
            });
        } else {
            done();
        }
    });
};

exports.getFiles = getFiles;
exports.build = build;
