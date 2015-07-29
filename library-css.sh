#!/bin/bash

# Symlink css files from library into the /libcss folder.

mkdir -p libcss;
ln -s ../node_modules/multiuser-file-menu/css/style.css libcss/multiuser-file-menu.css;
ln -s ../node_modules/zenpen-toolbar/css/style.css libcss/zenpen-toolbar.css;
ln -s ../node_modules/zenpen-toolbar/css/fonts.css libcss/zenpen-toolbar-fonts.css;

