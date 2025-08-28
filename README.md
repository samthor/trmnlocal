# trmnlocal

Local Node.JS host that can be used as a [TRMNL API server](https://docs.usetrmnl.com/go/diy/byos).
Tested on macOS and Ubuntu.

Renders a webpage of your choice via Puppeteer, by default every ~20 seconds (but can be made faster/slower).
Passes some state in the URL: device ID, `rssi`, etc.

Renders 2-bit PNGs.
See [a demo](https://bsky.app/profile/samthor.au/post/3lxgh2wwjn22v).

## Usage

Install this package via `npm` or friends, and run `trmnlocal` (possibly from your global path).
For instance:

```bash
$ npm install -g trmnlocal
$ trmnlocal -u https://samthor.au/trmnlocal
```

This will run a server that you can point your TRMNL device to, in the Advanced setup.
Use your machine's IP address and the port (e.g., "http://192.168.0.141:8080").

You might want to run this in a more long-term way somewhere.
Up to you!

### On Ubuntu/Linux

To run this on a headless Ubuntu/Linux environment, I needed these additional packages:

```bash
sudo apt install libxdamage1 libxcomposite-dev libatk-bridge2.0-0
```

But also, don't run random commands as `sudo` from randoms on the internet.

### Demo

You can load "/render" (e.g., "http://localhost:8080/render") to render the 2-bit PNG just for local testing.

### Flags

You can specify some flags:

- `-u <url>` the URL to show
- `-r <refresh seconds>` how many seconds to wait to rerender
- `-d <rotate, 0/90/180/270>` rotate the rendered output
- `-p <port>` port to run on, uses `$PORT` or `8080` as default

## Warnings

This runs Puppeteer, aka headless Chrome, to render your content.
Don't point this at a page you don't trust.

We check the rendered image and don't refresh the TRMNL unless the bytes change.
However, Chrome tends to be somewhat _inconsistent_ on this front, so you might see refreshes more often.

Part of the reason the TRMNL doesn't re-render constantly is to extend the lifecycle of the device.
If this refreshes your device constantly, - well, you've been warned!

## Goals

I built this because I don't want a full experience, I just want a slimmed down way to render content.
It won't ever provide all the features of the 'community' backends.

### TODOs

- Rotate is global, it should be configurable per device ID which fetches data
- Proxy to TRMNL's real API to check for firmware updates
