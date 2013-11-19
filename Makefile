PACKAGE_NAME = achook

all: xpi

xpi: buildscript/makexpi.sh
	cp buildscript/makexpi.sh ./
	./makexpi.sh -n $(PACKAGE_NAME) -o
	rm ./makexpi.sh
	make -C gmail-config && cp gmail-config/gmail-config.xpi ./

buildscript/makexpi.sh:
	git submodule update --init
