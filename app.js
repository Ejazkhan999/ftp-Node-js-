const http = require("http");
const fs = require("fs");

// Third-party modules
const ftp = require("basic-ftp");
var { Base64Encode } = require("base64-stream");

let port = 3000;

http
  .createServer((req, response) => {
    /**
     * `/` loads index.html
     */
    if (req.url == "/" && req.method.toLowerCase() == "get") {
      response.setHeader("Content-Type", "text/html");
      const stream = fs.createReadStream(`${__dirname}/index.html`);
      // No need to call res.end() because pipe calls it automatically
      stream.pipe(response);
    } else if (req.url == "/fileUpload" && req.method.toLowerCase() == "post") {
      /**
       * `/fileUpload` only works with POST
       * Saves uploaded files to the root
       */
      let contentLength = parseInt(req.headers["content-length"]);
      if (isNaN(contentLength) || contentLength <= 0) {
        response.statusCode = 411;
        response.end(
          JSON.stringify({ status: "error", description: "No File" })
        );
        return;
      }

      // Try to use the original filename
      let filename = req.headers["filename"];
      if (filename == null) {
        filename = "file." + req.headers["content-type"].split("/")[1];
      }

      const client = new ftp.Client(/*timeout = 180000*/); // 2min timeout for debug
      client.ftp.verbose = true;
      client
        .access({
          host: "localhost",
          user: "anonymous",
          password: "",
          secure: false,
        })
        .then((ftpResponse) => {
          (async () => {
            try {
              // Upload the image to the FTP server
              await client.uploadFrom(req, `uploads/${filename}`);

              // Download the image from the FTP server and send it as response
              response.setHeader("Content-Type", req.headers["content-type"]);
              var base64Encoder = new Base64Encode();
              base64Encoder.pipe(response);
              await client.downloadTo(base64Encoder, `uploads/${filename}`);
            } catch (err) {
              console.log(err);
              response.statusCode = 400;
              response.setHeader("Content-Type", "application/json");
              response.end(
                JSON.stringify({ status: "error", description: error })
              );
            }
            client.close();
          })();
        });
    } else {
      /**
       * Error on any other path
       */
      response.setHeader("Content-Type", "text/html");
      response.end("<html><body><h1>Page Doesn't exist<h1></body></html>");
    }
  })
  .listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
