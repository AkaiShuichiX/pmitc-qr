const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs');
const path = require('path');
const fetch = require("node-fetch"); // เวอร์ชัน 2 เท่านั้น
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// ข้อมูลผู้ใช้
const users = {
    "admin": "1234",
    "admin2": "12345678",
};

// API ของ Google Script ที่สร้าง
const GG_Sheet_Manager = "";
const GG_Line_Report = "";

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username or password is missing." });
    }

    if (users[username] && users[username] === password) {
        return res.status(200).json({ success: true, message: "Login successful." });
    } else {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
    }
});

// รับข้อมูลจากผู้สเเกนเเละส่งไปยัง Google Script เพื่อบันทึก
app.post("/api/submit", (req, res) => {
  const { time, no, studentId, name, year, subject, status } = req.body;

  console.log("Received data:", req.body);

  fetch(GG_Sheet_Manager, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          "การตอบสนองของเซิฟเวอร์ไม่โอเค: " + response.statusText
        );
      }
      return response.text();
    })
    .then((text) => {
      try {
        const data = JSON.parse(text);
        console.log("Data sent to Google Script successfully:", data);
        res.json({
          message: "ข้อมูลถูกบันทึกลง Google Sheet",
          success: true,
          googleResponse: data,
        });
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received response text:", text);
        res.status(500).json({
          message: "ข้อมูลที่ได้รับไม่ใช่ JSON",
          success: false,
          receivedText: text,
        });
      }
    })
    .catch((error) => {
      console.error("Error sending data to Google Script:", error);
      res.status(500).json({
        message: "เกิดข้อผิดพลาดในการส่งข้อมูลไปยัง Google Script",
        success: false,
      });
    });
});

// รับข้อมูลเเละส่งไปยัง Google Script เเละเเจ้งเตือนไลน์
app.post("/api/sendreport", (req, res) => {
  const { time, year, subject } = req.body;

  console.log("Received data:", req.body);
        
  fetch(GG_Line_Report, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          "การตอบสนองของเซิฟเวอร์รายงานไม่โอเค: " + response.statusText
        );
      }
      return response.text();
    })
    .then((text) => {
      try {
        const data = JSON.parse(text);
        console.log("Data sent to Google Script successfully:", data);
        res.json({
          message: "การรายงานถูกส่งเเล้ว",
          success: true,
          googleResponse: data,
        });
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received response text:", text);
        res.status(500).json({
          message: "ข้อมูลรายงานที่ได้รับไม่ใช่ JSON",
          success: false,
          receivedText: text,
        });
      }
    })
    .catch((error) => {
      console.error("Error sending data to Google Script:", error);
      res.status(500).json({
        message: "เกิดข้อผิดพลาดในการส่งข้อมูลรายงานไปยัง Google Script",
        success: false,
      });
    });
});

// ให้ข้อมูลชื่อไฟล์ในโฟล์เดอร์ StudentsData
app.get('/api/students', (req, res) => {
  const folderPath = path.join(__dirname, 'public', 'StudentsData');
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).send('Error reading directory');
    }
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    res.json(txtFiles);
  });
});

// โหลดข้อมูลจากไฟล์ที่ต้องการ
app.get('/api/students/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'StudentsData', req.params.filename);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading file');
    }
    res.send(data);
  });
});

app.listen(port, () => {
  console.log(`Running Website on Port - ${port}`);
});
