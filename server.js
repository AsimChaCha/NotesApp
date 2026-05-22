const express = require("express");
const mongoose = require("mongoose");
const promClient = require("prom-client");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/devprojectdb";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const requestCounter = new promClient.Counter({
  name: "devproject_http_requests_total",
  help: "Total HTTP requests received by DevProject app",
  labelNames: ["method", "path"]
});

register.registerMetric(requestCounter);

app.use((req, res, next) => {
  requestCounter.inc({
    method: req.method,
    path: req.path
  });
  next();
});

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("MongoDB connection failed:", error.message);
  });

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Note = mongoose.model("Note", noteSchema);

function createHtmlPage(notes) {
  const noteList = notes
    .map((note) => `<li>${note.title}</li>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>DevProject Notes App</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #eef2f7;
            margin: 0;
            padding: 40px;
          }

          .box {
            max-width: 650px;
            margin: auto;
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.12);
          }

          h1 {
            margin-top: 0;
            color: #222;
          }

          input {
            padding: 10px;
            width: 70%;
            border: 1px solid #ccc;
            border-radius: 6px;
          }

          button {
            padding: 10px 15px;
            border: none;
            background: #222;
            color: white;
            border-radius: 6px;
            cursor: pointer;
          }

          li {
            background: #f3f3f3;
            margin: 8px 0;
            padding: 10px;
            border-radius: 6px;
          }

          .small {
            color: #555;
            font-size: 14px;
          }
        </style>
      </head>

      <body>
        <div class="box">
          <h1>DevProject Notes App</h1>
          <p class="small">
            This application is deployed using Jenkins, Docker, Kubernetes, MongoDB, Prometheus and Grafana.
          </p>

          <form action="/add" method="POST">
            <input type="text" name="title" placeholder="Write a note..." required />
            <button type="submit">Save</button>
          </form>

          <h2>Saved Notes</h2>
          <ul>
            ${noteList || "<li>No notes added yet</li>"}
          </ul>
        </div>
      </body>
    </html>
  `;
}

app.get("/", async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.send(createHtmlPage(notes));
});

app.post("/add", async (req, res) => {
  await Note.create({
    title: req.body.title
  });

  res.redirect("/");
});

app.get("/health", (req, res) => {
  res.json({
    app: "DevProject",
    status: "running"
  });
});

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`DevProject app running on port ${PORT}`);
});
