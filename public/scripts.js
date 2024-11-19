const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const resultDiv = document.getElementById("result");

let isScanning = false;
let studentsData = [];

const sheetMap = {
  "ปวช.1": ["การสร้างเกมคอมพิวเตอร์", "การเขียนซีชาร์ปดอทเน็ต"],
  "ปวช.2": ["การพัฒนาเว็บด้วย HTML", "การเขียนโปรแกรมเบื้องต้น"],
  "ปวช.3": ["server", "test"],
};

async function loadStudentData() {
  const response = await fetch("/api/students");
  const fileNames = await response.json();

  const filePromises = fileNames.map(async (fileName) => {
    const response = await fetch(`/api/students/${fileName}`);
    return response.text();
  });

  const fileDataArray = await Promise.all(filePromises);
  studentsData = fileDataArray
    .join("\n")
    .trim()
    .split("\n")
    .map((line) => {
      const [no, id, name, yeardb] = line.split(",");
      return { no, id, name, yeardb };
    });
  
  populateLevels();
  updateSubjectOptions();
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" } },
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Error accessing the camera: ", err);
    alert("ไม่สามารถเปิดกล้องหลังได้: คุณต้องอนุญาตการใช้กล้อง");
  }
}

function populateLevels() {
  const levelSelect = document.getElementById("level");

  levelSelect.innerHTML = "";

  for (const level in sheetMap) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    levelSelect.appendChild(option);
  }
}

function updateSubjectOptions() {
  const level = document.getElementById("level").value;
  const subjectSelect = document.getElementById("subject");

  subjectSelect.innerHTML = "";

  if (sheetMap[level]) {
    sheetMap[level].forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });
  }
}

document.getElementById("reportButton").addEventListener("click", sendData);

let isButtonDisabled = false;

async function sendData() {
  
  if (isButtonDisabled) return;
  isButtonDisabled = true;

  const reportButton = document.getElementById("reportButton");
  reportButton.disabled = true;

  document.getElementById("resultModalBody").innerHTML = `
    <div class="alert alert-info" role="alert">
      กำลังส่งข้อมูลรายงานวิชา<br><strong>${
        document.getElementById("subject").value
      }</strong><br>กรุณารอสักครู่...
    </div>
  `;

  const resultModal = new bootstrap.Modal(
    document.getElementById("resultModal")
  );
  resultModal.show();

  const selectedYear = document.getElementById("level").value;
  const selectedSubject = document.getElementById("subject").value;

  const currentTime = new Date().toLocaleString();
  const payload = {
    time: currentTime,
    year: selectedYear,
    subject: selectedSubject,
    status: true,
  };

  try {
    const response = await fetch("/api/sendreport", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("ไม่สามารถส่งข้อมูลให้เซิร์ฟเวอร์ได้");
    }

    const data = await response.json();
    console.log("ข้อมูลถูกส่งเรียบร้อย:", data);

    document.getElementById("resultModalBody").innerHTML = `
      <div class="alert alert-success" role="alert">
        <strong>ส่งข้อมูลเรียบร้อยสำหรับวิชา:</strong><br><strong>${selectedSubject}</strong><br>
        <strong>สถานะ:</strong> ${data.message}
      </div>
    `;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการส่งข้อมูล:", error);

    document.getElementById("resultModalBody").innerHTML = `
      <div class="alert alert-danger" role="alert">
        <strong>เกิดข้อผิดพลาดในการส่งข้อมูล:</strong><br>
        ${error.message}
      </div>
    `;
  } finally {
    isButtonDisabled = false;
    reportButton.disabled = false;
  }
}

let timeoutId;

function scanQRCode() {
  if (isScanning) return;
  isScanning = true;

  timeoutId = setTimeout(() => {
    isScanning = false;
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <strong>หากไม่มีไรเกิดขึ้นหลังสเเกนกรุณารีเฟรช</strong>
            </div>
        `;
  }, 8000);

  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

  if (qrCode) {
    const scannedId = qrCode.data;
    const student = studentsData.find((s) => s.id === scannedId);

    resultDiv.style.display = "block";
    resultDiv.innerHTML = "กำลังส่งข้อมูลของ " + scannedId + " ไปยังเซิฟเวอร์";

    if (student) {
      const currentTime = new Date().toLocaleString();
      const selectedYear = document.getElementById("level").value;
      const selectedSubject = document.getElementById("subject").value;

      if (student.yeardb === selectedYear) {
        const payload = {
          time: currentTime,
          no: student.no,
          studentId: student.id,
          name: student.name,
          year: selectedYear,
          subject: selectedSubject,
          status: true,
        };

        fetch("/api/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("ไม่สามารถส่งข้อมูลให้เซิฟเวอร์ได้");
            }
            return response.json();
          })
          .then((data) => {
            clearTimeout(timeoutId);
            const selectedSubject = document.getElementById("subject").value;
            resultDiv.innerHTML = `
                        <div class="alert alert-success" role="alert">
                            <strong>พบข้อมูลนักเรียน:</strong><br>
                            <strong>ชื่อ:</strong> ${student.name}<br>
                            <strong>วิชา:</strong> ${selectedSubject}<br>
                            <strong>เลขที่:</strong> ${student.no}<br>
                            <strong>เลขประจำตัว:</strong> ${student.id}<br>
                            <strong>สถานะ:</strong> ${data.message}
                        </div>
                    `;
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            resultDiv.innerHTML = `
                        <div class="alert alert-danger" role="alert">
                            <strong>เกิดข้อผิดพลาดในการส่งข้อมูล:</strong><br>
                            ${error.message}
                        </div>
                    `;
          })
          .finally(() => {
            setTimeout(() => {
              resultDiv.style.display = "none";
              isScanning = false;
            }, 4000);
          });
      } else {
        clearTimeout(timeoutId);
        resultDiv.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <strong>ชั้นปีไม่ตรงกัน:</strong><br>
                    กรุณาตรวจสอบข้อมูลชั้นปีของนักเรียน
                </div>
            `;
        setTimeout(() => {
          resultDiv.style.display = "none";
          isScanning = false;
        }, 4000);
      }
    } else {
      clearTimeout(timeoutId);
      resultDiv.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <strong>ไม่พบข้อมูลนักเรียนในระบบ</strong><br>
                    กรุณาตรวจสอบ QR Code หรือข้อมูลที่สแกน
                </div>
            `;
      setTimeout(() => {
        resultDiv.style.display = "none";
        isScanning = false;
      }, 4000);
    }
  } else {
    clearTimeout(timeoutId);
    setTimeout(() => {
      isScanning = false;
    }, 500);
  }
}

checkLogin()

function checkLogin() {
  const cookies = document.cookie.split("; ");
  const userCookie = cookies.find((cookie) => cookie.startsWith("username="));

  if (userCookie) {
  } else {
    window.location.href = "login.html";
  }
}

function logout() {
  document.cookie = "username=; path=/; max-age=0";
  window.location.href = "login.html";
}

window.onload = async () => {
  await loadStudentData();
  startCamera();
  setInterval(scanQRCode, 1000);
};
