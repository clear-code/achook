PACKAGE_NAME = achook

all: xpi

xpi: makexpi/makexpi.sh
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o
	make -C gmail-config-imap && cp gmail-config-imap/gmail-config-imap.xpi ./
	make -C gmail-config-pop && cp gmail-config-pop/gmail-config-pop.xpi ./

makexpi/makexpi.sh:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi
