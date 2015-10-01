#!/bin/bash

# Fail if attempting to use a variable which hasn't been set.
set -u;
# Stop on first error.
set -e;

# Symlink css files from library into the /libcss folder.

mkdir -p libcss;
ln -s -f -T ../node_modules/multiuser-file-menu/css libcss/multiuser-file-menu;
ln -s -f -T ../node_modules/zenpen-toolbar/css libcss/zenpen-toolbar;
