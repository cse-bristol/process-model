.PHONY: build npm js css clean tests watch;

build: js css; npm install; mkdir -p bin; 
npm: ; npm install;
bin: ; mkdir -p bin;
js: npm bin; browserify -d js/process-model.js -o bin/main.js;
css: bin libcss; libcss/* cat css/* > bin/style.css;

libcss: ; ./library-css.sh;

clean: ; rm -rf ./bin/*

tests: ; node ./js/test.js

# Runs in parallel using the '&' operator.
watch: libcss; watchify -d js/process-model.js -o bin/main.js & catw libcss/* css/* -o bin/style.css -v;
