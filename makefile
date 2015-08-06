.PHONY: build npm js css clean tests watch;

build: js css fonts;

js: npm bin; browserify -d js/process-model.js -o bin/main.js;
bin: ; mkdir -p bin;
npm: ; npm install;

css: bin libcss; cat libcss/* css/* > bin/style.css;
libcss: ; ./library-css.sh;

fonts: ; ln -s -f -T ../node_modules/zenpen-toolbar/css/fonts bin/fonts;

tests: ; echo "no tests";

clean: ; rm -rf bin libcss;

# Runs in parallel using the '&' operator.
watch: bin libcss; watchify -d js/process-model.js -o bin/main.js & catw libcss/* css/* -o bin/style.css -v;
