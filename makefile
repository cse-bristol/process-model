build: ; npm install; mkdir -p bin; sudo browserify process-model.js -o ./bin/main.js

clean: ; rm -rf ./bin/*

tests: ; node ./test.js