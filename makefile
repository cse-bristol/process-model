build: ; npm install; mkdir -p bin; browserify -d js/process-model.js -o bin/main.js

clean: ; rm -rf ./bin/*

tests: ; node ./js/test.js

watch: ; watchify -d js/process-model.js -o bin/main.js;
