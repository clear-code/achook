PACKAGE_NAME = achook

all: xpi

xpi: buildscript/makexpi.sh
	cp buildscript/makexpi.sh ./
	./makexpi.sh -n $(PACKAGE_NAME) -o
	rm ./makexpi.sh
	make -C gmail-config-imap && cp gmail-config-imap/gmail-config-imap.xpi ./

buildscript/makexpi.sh:
	git submodule update --init
