#!/bin/bash

DIR='.local/share/gnome-shell/extensions/cgm-indicator@silvertejp.nu'
mkdir -p ~/"$DIR"
cp extension.js metadata.json ~/"$DIR"
