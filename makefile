.PHONY: build npm js css clean tests watch;

build: js css; 

js: npm bin; browserify -d js/process-model.js -o bin/main.js;
bin: ; mkdir -p bin;
npm: ; npm install;

css: bin libcss; cat libcss/* css/* > bin/style.css;
libcss: ; ./library-css.sh;

tests: ; echo "no tests";

clean: ; rm -rf bin libcss;

# Runs in parallel using the '&' operator.
watch: bin libcss; watchify -d js/process-model.js -o bin/main.js & catw libcss/* css/* -o bin/style.css -v;
