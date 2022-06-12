import express from "express";
import cors from "cors";
import env from "./config.js";
import templateRoute from "./routes/template.js";
import certificateRoute from "./routes/certificate.js";
import bodyParser from "body-parser";
import del from "del";

const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use("/template", templateRoute);
app.use("/certificate", certificateRoute);

app.listen(env.PORT, () => console.log(`Server started at port ${env.PORT}`));

const clearFontsDir = () => {
  try {
    del.sync(["./storage/fonts/**"], ["!./storage/fonts/"]);
  } catch (err) {
    console.log("Set Interval error");
  }
};
//setInterval(clearFontsDir, 2000)
