build: build-client build-server;

build-client: ; cd client; npm install; cd ..; mkdir -p client/bin; browserify -d client/process-model.js -o bin/main.js
build-server: ; cd server; npm install; cd ..

clean: ; rm -rf ./bin/*

tests: ; node ./client/test.js
