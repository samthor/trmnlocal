Local TRMNL host

# trmnlocal

Local Node.JS host that can be used as a TRMNL API server.

Renders a webpage of your choice via Puppeteer, by default every ~20 seconds (but can be made faster/slower).

Renders 2-bit PNGs.
See [a demo](https://bsky.app/profile/samthor.au/post/3lxgh2wwjn22v).

## Usage

Install this package via `npm` or friends, and run `trmnlocal` (possibly from your global path).

This will run a server that you can point your TRMNL device to, in the Advanced setup.
Use your machine's IP address and the port (e.g., "http://192.168.0.141:8080").

You might want to run this in a more long-term way somewhere.
Up to you!

## Warnings

This runs Puppeteer, aka headless Chrome, to render your content.
Don't point this at a page you don't trust.

We check the rendered image and don't refresh the TRMNL unless the bytes change.
However, Chrome tends to be somewhat _inconsistent_ on this front, so you might see refreshes more often.

Part of the reason the TRMNL doesn't re-render constantly is to extend the lifecycle of the device.
If this refreshes your device constantly, - well, you've been warned!
