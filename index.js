const axios = require("axios");

const arguments = process.argv;

const URL = "depric.com";
const PORT = arguments[2];

if (!PORT) {
  throw new Error(
    "Enter a port number for http://localhost:???? (example: node index.js 3001)"
  );
}

if (
  !(
    !isNaN(PORT) &&
    !isNaN(parseFloat(PORT)) &&
    Number.isInteger(parseFloat(PORT))
  )
) {
  throw new Error(
    "The port number must be an integer (example: node index.js 3001)"
  );
}

const uuidGenerate = async () => {
  try {
    const response = await axios({
      method: "GET",
      url: `https://${URL}/uuid`,
    });

    return response.data.uuid;
  } catch (e) {
    throw new Error(e.message);
  }
};

const init = async () => {
  const uuid = await uuidGenerate();

  const socketServerUrl = `https://${uuid}.${URL}`;
  const hostToLive = `http://localhost:${PORT}`;

  console.log(`Connecting to ${socketServerUrl} ...\n`);

  const socket = require("socket.io-client")(socketServerUrl, {
    auth: {
      uuid,
    },
  });

  socket.on("connect", () => {
    console.log(
      `Connected! Use this url to connect to ${hostToLive}: \n\n\r\t${socketServerUrl}\n\r`
    );
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected from ${socketServerUrl}`);
  });

  socket.on("new_request", (payload) => {
    const { pathname, method, headers, body } = payload;

    const localhostUrl = hostToLive + pathname;

    execute(localhostUrl, method, headers, body);
  });

  const execute = (localhostUrl, method, headers, body) => {
    delete headers["postman-token"];
    delete headers["content-length"];
    delete headers["user-agent"];

    axios({
      method,
      url: localhostUrl,
      headers,
      data: body,
    })
      .then((response) => {
        socket.emit("response_ok", response.status, response.data);
      })
      .catch((error) => {
        socket.emit(
          "response_error",
          error.response.status,
          error.response.data
        );
        console.log("Axios ERROR:", error);
      });
  };
};

init();
