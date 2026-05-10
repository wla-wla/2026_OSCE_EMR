const firebaseConfig = {
  apiKey: "AIzaSyCETgjHq6B0tU3ds0JObJ_W0a9xlhjIpFg",
  authDomain: "emr-3b199.firebaseapp.com",
  projectId: "emr-3b199",
  storageBucket: "emr-3b199.firebasestorage.app",
  messagingSenderId: "168094069027",
  appId: "1:168094069027:web:b7d53c5e0887214f939c96",
  databaseURL: "https://emr-3b199-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const EMPTY_TEXT = "-";
const patientFiles = {
  P001: "data/patients/P001.json",
  P002: "data/patients/P002.json",
  P003: "data/patients/P003.json",
  P004: "data/patients/P004.json"
};

const aliases = {
  "p001": "P001",
  "p002": "P002",
  "p003": "P003",
  "p004": "P004",
  "patient-a": "P001",
  "patient-b": "P002",
  "patient-c": "P003",
  "patient-d": "P004",
  "이정희": "P001",
  "김영수": "P002",
  "안정원": "P003",
  "김정남": "P004"
};

const sectionIds = [
  "summary", "base", "timeline", "hpi", "er", "notes", "problems", "history",
  "vitals", "labs", "diagnostics", "homeMeds", "medId", "medRec", "orders",
  "mar", "dischargeMeds", "pharmacy"
];

let currentPatient = null;
let currentPatientCode = "";
let labReferenceMaster = null;
let firebaseDatabase = null;

const els = {
  form: document.getElementById("patientSearchForm"),
  input: document.getElementById("patientIdInput"),
  banner: document.getElementById("patientBanner"),
  badges: document.getElementById("safetyBadges"),
  loadedPatientLabel: document.getElementById("loadedPatientLabel"),
  status: document.getElementById("statusMessage"),
  rightSummary: document.getElementById("rightSummary"),
  navItems: Array.from(document.querySelectorAll(".nav-item"))
};

document.addEventListener("DOMContentLoaded", () => {
  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await searchPatient(els.input.value);
  });

  els.navItems.forEach((item) => {
    item.addEventListener("click", () => showSection(item.dataset.section));
  });

  loadLabReference();
});

async function loadLabReference() {
  try {
    const response = await fetch("data/reference/lab_reference_master_general_v1_1.json");
    if (response.ok) {
      labReferenceMaster = await response.json();
    }
  } catch (_) {
    labReferenceMaster = null;
  }
}

async function searchPatient(rawQuery) {
  const query = (rawQuery || "").trim();
  if (!query) {
    setStatus("환자 조회어를 입력해 주세요.", true);
    return;
  }

  setStatus("차트를 조회하는 중입니다.", false);
  try {
    const patient = await loadPatient(query);
    currentPatient = patient;
    currentPatientCode = resolvePatientCode(query) || derivePatientCode(patient) || query;
    renderAll(patient);
    setStatus("차트가 로딩되었습니다.", false);
    showSection("summary");
  } catch (error) {
    currentPatient = null;
    currentPatientCode = "";
    clearChart();
    setStatus("조회된 환자 차트가 없습니다.", true);
    console.error(error);
  }
}

async function loadPatient(patientId) {
  const code = resolvePatientCode(patientId);
  if (code && patientFiles[code]) {
    try {
      const response = await fetch(patientFiles[code], { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch (_) {
      // Fall through to optional remote lookup.
    }
  }

  const remotePatient = await loadPatientFromFirebase(patientId, code);
  if (remotePatient) return remotePatient;
  throw new Error("Patient not found");
}

function resolvePatientCode(patientId) {
  const normalized = String(patientId || "").trim().toLowerCase();
  if (aliases[normalized]) return aliases[normalized];
  const upper = normalized.toUpperCase();
  if (patientFiles[upper]) return upper;
  return "";
}

function derivePatientCode(patient) {
  const caseId = patient?.caseMeta?.caseId || patient?.patientHeader?.patientId || "";
  return resolvePatientCode(caseId);
}

async function loadPatientFromFirebase(patientId, code) {
  try {
    if (!window.firebase || !firebaseConfig.databaseURL) return null;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    firebaseDatabase = firebaseDatabase || firebase.database();
    const keys = [code, patientId, String(patientId).toUpperCase(), String(patientId).toLowerCase()].filter(Boolean);
    for (const key of [...new Set(keys)]) {
      const snapshot = await firebaseDatabase.ref(`patients/${key}`).once("value");
      if (snapshot.exists()) return snapshot.val();
    }
  } catch (error) {
    console.warn("Remote lookup unavailable", error);
  }
  return null;
}

function renderAll(patient) {
  renderPatientBanner(patient);
  renderSafetyBadges(patient);
  renderSummary(patient);
  renderBase(patient);
  renderTimeline(patient.timeline || []);
  renderHpi(patient);
  renderEr(patient.clinicalRecords?.erRecord);
  renderNotes(patient.clinicalRecords || {});
  renderProblemList(patient.problemList || [], patient.diagnosisTimeline || []);
  renderHistory(patient);
  renderVitals(patient.vitalSigns || []);
  renderLabPivot(patient.labResults || []);
  renderDiagnostics(patient.diagnosticTests || [], patient.procedures || [], patient.surgicalHistory || []);
  renderHomeMedications(patient.homeMedications || []);
  renderMedicationIdentification(patient.medicationIdentification || []);
  renderMedicationReconciliation(patient.medicationReconciliation || []);
  renderMedicationOrders(patient.medicationOrders || []);
  renderMAR(patient.medicationAdministrationRecords || {});
  renderDischargeMedications(patient.dischargeMedications || []);
  renderPharmacyReviewRequests(patient.pharmacyReviewRequests || [], patient.consultations || []);
  renderRightSummary(patient);
}

function clearChart() {
  els.banner.classList.add("is-empty");
  els.banner.innerHTML = `
    <div>
      <p class="eyebrow">Patient Chart</p>
      <h2>환자를 조회해 주세요</h2>
      <p class="muted">예: P001, P002, patient-a, 김영수</p>
    </div>
    <div id="safetyBadges" class="badge-row"></div>
  `;
  els.badges = document.getElementById("safetyBadges");
  els.loadedPatientLabel.textContent = "No patient loaded";
  sectionIds.forEach((id) => setHtml(id, ""));
  els.rightSummary.innerHTML = `<h2>Chart Summary</h2><div class="empty-state">조회된 환자 차트가 없습니다.</div>`;
}

function setStatus(message, isError) {
  els.status.textContent = message;
  els.status.style.borderColor = isError ? "#d9a0a0" : "";
  els.status.style.background = isError ? "#fff6f6" : "";
}

function showSection(sectionId) {
  sectionIds.forEach((id) => {
    document.getElementById(id)?.classList.toggle("is-active", id === sectionId);
  });
  els.navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.section === sectionId));
}

function renderPatientBanner(patient) {
  const header = patient.patientHeader || {};
  const record = patient.hospitalRecord || {};
  const displayId = header.patientId || currentPatientCode || patient.caseMeta?.caseId || "";
  const title = `${value(header.name)} ${header.sex ? `(${escapeHtml(header.sex)}/${value(header.age)})` : ""}`;
  els.banner.classList.remove("is-empty");
  els.banner.innerHTML = `
    <div>
      <p class="eyebrow">Patient Chart</p>
      <h2>${title}</h2>
      <p class="muted">${joinParts([
        displayId && `ID ${escapeHtml(displayId)}`,
        header.mrn && `MRN ${escapeHtml(header.mrn)}`,
        record.department,
        record.ward,
        record.admissionDate && `입원 ${record.admissionDate}`,
        record.plannedDischargeDate && `퇴원예정 ${record.plannedDischargeDate}`
      ])}</p>
    </div>
    <div id="safetyBadges" class="badge-row"></div>
  `;
  els.badges = document.getElementById("safetyBadges");
  els.loadedPatientLabel.textContent = `${header.name || "Unknown"} ${displayId ? `(${displayId})` : ""}`;
}

function renderSafetyBadges(patient) {
  const badges = patient.patientHeader?.safetyBadges || [];
  const allergies = patient.patientHeader?.allergies || [];
  const merged = [...badges];
  allergies.forEach((allergy) => {
    if (allergy?.substance && !merged.some((badge) => badge.label === allergy.substance)) {
      merged.unshift({ label: allergy.substance, type: "allergy" });
    }
  });

  els.badges.innerHTML = merged.length
    ? merged.map((badge) => `<span class="badge ${escapeAttr(badge.type || "")}">${escapeHtml(badge.label || EMPTY_TEXT)}</span>`).join("")
    : `<span class="badge">주의 배지 없음</span>`;
}

function renderSummary(patient) {
  const header = patient.patientHeader || {};
  const record = patient.hospitalRecord || {};
  const recentVital = sortByDate(patient.vitalSigns || []).at(-1);
  const abnormalLabs = (patient.labResults || []).filter((lab) => lab.flag && lab.flag !== "N").length;
  const activeProblems = (patient.problemList || []).filter((problem) => (problem.status || "active") === "active").length;
  const activeOrders = (patient.medicationOrders || []).filter((order) => !order.status || String(order.status).includes("active")).length;

  setHtml("summary", `
    <h2 class="section-title">환자 요약</h2>
    <div class="grid">
      ${kv("환자명", header.name)}
      ${kv("성별/나이", joinParts([header.sex, header.age]))}
      ${kv("생년월일", header.birthDate)}
      ${kv("진료과", record.department)}
      ${kv("병동", record.ward)}
      ${kv("입원경로", record.admissionRoute)}
      ${kv("입원일", record.admissionDate)}
      ${kv("퇴원예정일", record.plannedDischargeDate)}
      ${kv("Allergy", allergiesText(header.allergies))}
      ${kv("보험", record.insurance)}
    </div>
    <div class="panel">
      <h3 class="panel-title">최근 상태</h3>
      <div class="panel-body grid">
        ${kv("최근 Vital", recentVital ? formatVitalBrief(recentVital) : EMPTY_TEXT)}
        ${kv("Lab 이상 표시", `${abnormalLabs}건`)}
        ${kv("활성 Problem", `${activeProblems}건`)}
        ${kv("활성 Order", `${activeOrders}건`)}
      </div>
    </div>
    <div class="panel">
      <h3 class="panel-title">Chief Complaint</h3>
      <div class="panel-body">${textBlock(patient.clinicalRecords?.chiefComplaint)}</div>
    </div>
    <div class="panel">
      <h3 class="panel-title">Admission Reason</h3>
      <div class="panel-body">${textBlock(patient.clinicalRecords?.admissionReason)}</div>
    </div>
  `);
}

function renderBase(patient) {
  const header = patient.patientHeader || {};
  const record = patient.hospitalRecord || {};
  setHtml("base", `
    <h2 class="section-title">기본정보/병원기록</h2>
    <div class="panel">
      <h3 class="panel-title">환자 기본정보</h3>
      <div class="panel-body grid">
        ${kv("환자번호", header.patientId || currentPatientCode)}
        ${kv("등록번호", header.mrn)}
        ${kv("환자명", header.name)}
        ${kv("성별", header.sex)}
        ${kv("나이", header.age)}
        ${kv("생년월일", header.birthDate)}
        ${kv("신장", header.heightCm ? `${header.heightCm} cm` : "")}
        ${kv("체중", header.weightKg ? `${header.weightKg} kg` : "")}
        ${kv("혈액형", header.bloodType)}
        ${kv("Allergy", allergiesText(header.allergies))}
      </div>
    </div>
    <div class="panel">
      <h3 class="panel-title">병원기록</h3>
      <div class="panel-body grid">
        ${kv("방문유형", record.visitType)}
        ${kv("입원일", record.admissionDate)}
        ${kv("입원일시", record.admissionDateTime)}
        ${kv("퇴원일", record.dischargeDate)}
        ${kv("퇴원예정일", record.plannedDischargeDate)}
        ${kv("입원경로", record.admissionRoute)}
        ${kv("진료과", record.department)}
        ${kv("병동", record.ward)}
        ${kv("병실", record.room)}
        ${kv("담당의", record.attendingPhysician)}
        ${kv("보험", record.insurance)}
        ${kv("격리", record.isolation)}
        ${kv("낙상위험", record.fallRisk)}
        ${kv("식이", record.diet)}
        ${kv("Code status", record.codeStatus)}
      </div>
    </div>
  `);
}

function renderTimeline(timeline) {
  const rows = sortByDate(timeline);
  setHtml("timeline", `
    <h2 class="section-title">전체 타임라인</h2>
    ${rows.length ? `<ol class="timeline">${rows.map((event) => `
      <li>
        <time>${escapeHtml(formatDateTime(event.dateTime || event.date || ""))} ${event.category ? `· ${escapeHtml(event.category)}` : ""}</time>
        <strong>${escapeHtml(event.title || EMPTY_TEXT)}</strong>
        <div>${escapeHtml(event.summary || event.freeText || "")}</div>
      </li>
    `).join("")}</ol>` : emptyState("조회된 타임라인 기록이 없습니다.")}
  `);
}

function renderHpi(patient) {
  const hpi = patient.hpi || {};
  const ros = patient.ros || {};
  setHtml("hpi", `
    <h2 class="section-title">CC/HPI/ROS</h2>
    <div class="panel">
      <h3 class="panel-title">Chief Complaint</h3>
      <div class="panel-body">${textBlock(patient.clinicalRecords?.chiefComplaint)}</div>
    </div>
    <div class="panel">
      <h3 class="panel-title">HPI</h3>
      <div class="panel-body grid">
        ${kv("Onset", hpi.onset)}
        ${kv("Location", hpi.location)}
        ${kv("Duration", hpi.duration)}
        ${kv("Character", hpi.character)}
        ${kv("Aggravating", hpi.aggravatingFactors)}
        ${kv("Relieving", hpi.relievingFactors)}
        ${kv("Associated", hpi.associatedSymptoms)}
      </div>
      <div class="panel-body">${textBlock(hpi.timelineText)}</div>
    </div>
    <div class="panel">
      <h3 class="panel-title">ROS</h3>
      <div class="panel-body">${objectGrid(ros)}</div>
    </div>
  `);
}

function renderEr(erRecord) {
  setHtml("er", `
    <h2 class="section-title">응급실 기록</h2>
    ${erRecord ? `
      <div class="panel">
        <h3 class="panel-title">${escapeHtml(joinParts([erRecord.date, erRecord.dateTime, erRecord.arrivalMode]) || "응급실 기록")}</h3>
        <div class="panel-body grid">
          ${kv("내원수단", erRecord.arrivalMode)}
          ${kv("중증도", erRecord.triageLevel)}
          ${kv("초기 Vital", erRecord.triageVital)}
          ${kv("처치", erRecord.management)}
          ${kv("Disposition", erRecord.disposition)}
        </div>
        <div class="panel-body">${textBlock(erRecord.initialAssessment || erRecord.freeText)}</div>
      </div>
    ` : emptyState("조회된 응급실 기록이 없습니다.")}
  `);
}

function renderNotes(records) {
  const progress = records.progressNotes || [];
  const nursing = records.nursingNotes || [];
  const dischargePlanning = records.dischargePlanningNotes || [];
  const consult = records.consultNotes || [];
  const allNotes = [
    ...progress.map((note) => ({ ...note, group: "경과기록" })),
    ...nursing.map((note) => ({ ...note, group: "간호기록" })),
    ...dischargePlanning.map((note) => ({ ...note, group: "퇴원계획" })),
    ...consult.map((note) => ({ ...note, group: "협진기록" }))
  ];

  setHtml("notes", `
    <h2 class="section-title">입원/경과/간호/퇴원계획</h2>
    ${records.admissionNote ? renderNotePanel("입원기록", records.admissionNote) : ""}
    ${allNotes.length ? sortByDate(allNotes).map((note) => renderNotePanel(note.group, note)).join("") : emptyState("조회된 입원 중 기록이 없습니다.")}
    ${records.dischargeSummary ? renderNotePanel("퇴원요약", records.dischargeSummary) : ""}
  `);
}

function renderNotePanel(title, note) {
  return `
    <div class="panel">
      <h3 class="panel-title">${escapeHtml(title)} ${note.dateTime || note.date ? `· ${escapeHtml(formatDateTime(note.dateTime || note.date))}` : ""}</h3>
      <div class="panel-body grid">
        ${kv("작성자", note.authorRole)}
        ${kv("기록구분", note.noteType)}
        ${kv("진료과", note.department)}
      </div>
      <div class="panel-body">
        ${note.subjective ? `<h4 class="subhead">Subjective</h4>${textBlock(note.subjective)}` : ""}
        ${note.objective ? `<h4 class="subhead">Objective</h4>${textBlock(note.objective)}` : ""}
        ${note.assessment ? `<h4 class="subhead">Assessment</h4>${textBlock(note.assessment)}` : ""}
        ${note.plan ? `<h4 class="subhead">Plan</h4>${textBlock(note.plan)}` : ""}
        ${note.freeText ? textBlock(note.freeText) : ""}
      </div>
    </div>
  `;
}

function renderProblemList(problemList, diagnosisTimeline) {
  const problemRows = problemList.map((problem) => `
    <tr>
      <td>${escapeHtml(problem.problem || problem.diagnosis || EMPTY_TEXT)}</td>
      <td>${escapeHtml(problem.status || EMPTY_TEXT)}</td>
      <td>${escapeHtml(problem.onsetDate || EMPTY_TEXT)}</td>
      <td>${escapeHtml(problem.lastUpdated || EMPTY_TEXT)}</td>
      <td>${escapeHtml(problem.note || "")}</td>
    </tr>
  `).join("");
  const dxRows = diagnosisTimeline.map((dx) => `
    <tr>
      <td>${escapeHtml(formatDateTime(dx.dateTime || dx.date || ""))}</td>
      <td>${escapeHtml(dx.diagnosis || dx.problem || EMPTY_TEXT)}</td>
      <td>${escapeHtml(dx.status || EMPTY_TEXT)}</td>
      <td>${escapeHtml(dx.note || dx.summary || "")}</td>
    </tr>
  `).join("");

  setHtml("problems", `
    <h2 class="section-title">Problem List</h2>
    ${problemRows ? table(["Problem", "Status", "Onset", "Updated", "Note"], problemRows) : emptyState("조회된 Problem List가 없습니다.")}
    <h3 class="subhead">Diagnosis Timeline</h3>
    ${dxRows ? table(["Date", "Diagnosis", "Status", "Note"], dxRows) : emptyState("조회된 진단 타임라인이 없습니다.")}
  `);
}

function renderHistory(patient) {
  setHtml("history", `
    <h2 class="section-title">과거력/사회력/가족력</h2>
    <div class="panel">
      <h3 class="panel-title">과거력</h3>
      <div class="panel-body">${arrayTable(patient.pastMedicalHistory || [], ["condition", "date", "treatment", "note"], ["Condition", "Date", "Treatment", "Note"])}</div>
    </div>
    <div class="panel">
      <h3 class="panel-title">수술력</h3>
      <div class="panel-body">${arrayTable(patient.surgicalHistory || [], ["procedure", "date", "note"], ["Procedure", "Date", "Note"])}</div>
    </div>
    <div class="panel">
      <h3 class="panel-title">사회력</h3>
      <div class="panel-body">${objectGrid(patient.socialHistory || {})}</div>
    </div>
    <div class="panel">
      <h3 class="panel-title">가족력</h3>
      <div class="panel-body">${arrayTable(patient.familyHistory || [], ["relation", "condition", "note"], ["Relation", "Condition", "Note"])}</div>
    </div>
  `);
}

function renderVitals(vitals) {
  const rows = sortByDate(vitals).map((vital) => `
    <tr>
      <td>${escapeHtml(formatDateTime(vital.dateTime || vital.date || ""))}</td>
      <td>${escapeHtml(vital.label || "")}</td>
      <td class="${vitalClass(vital, "bp")}">${escapeHtml(vital.bp || joinParts([vital.sbp, vital.dbp], "/"))}</td>
      <td class="${vitalClass(vital, "hr")}">${escapeHtml(vital.hr ?? EMPTY_TEXT)}</td>
      <td class="${vitalClass(vital, "rr")}">${escapeHtml(vital.rr ?? EMPTY_TEXT)}</td>
      <td>${escapeHtml(vital.bt ?? EMPTY_TEXT)}</td>
      <td class="${vitalClass(vital, "spo2")}">${escapeHtml(vital.spo2 ?? EMPTY_TEXT)}</td>
      <td>${escapeHtml(vital.o2Device || EMPTY_TEXT)}</td>
      <td>${escapeHtml(vital.weightKg ?? EMPTY_TEXT)}</td>
      <td>${escapeHtml(vital.painScore ?? "")}</td>
    </tr>
  `).join("");

  setHtml("vitals", `
    <h2 class="section-title">Vital Signs</h2>
    ${rows ? table(["Date", "Label", "BP", "HR", "RR", "BT", "SpO2", "O2 device", "BW kg", "Pain"], rows) : emptyState("조회된 Vital 기록이 없습니다.")}
  `);
}

function renderLabPivot(labResults) {
  const grouped = new Map();
  const dateMap = new Map();

  labResults.forEach((lab) => {
    const key = lab.item || lab.testName || "Unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(withReference(lab));
    const dateKey = lab.date || lab.dateTime || lab.label || "";
    if (dateKey) dateMap.set(dateKey, lab.label || dateKey);
  });

  const dates = Array.from(dateMap.keys()).sort((a, b) => new Date(a) - new Date(b));
  const headers = ["검사명", "단위", "참고치", ...dates.map((date) => dateMap.get(date)), "Trend"];
  const rows = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([item, labs]) => {
    const byDate = new Map(labs.map((lab) => [lab.date || lab.dateTime || lab.label || "", lab]));
    const first = labs[0] || {};
    const values = dates.map((date) => renderLabCell(byDate.get(date))).join("");
    return `
      <tr>
        <td>${escapeHtml(item)}</td>
        <td>${escapeHtml(first.unit || EMPTY_TEXT)}</td>
        <td>${escapeHtml(first.referenceText || formatReference(first) || EMPTY_TEXT)}</td>
        ${values}
        <td>${escapeHtml(trendForLabs(dates.map((date) => byDate.get(date))))}</td>
      </tr>
    `;
  }).join("");

  setHtml("labs", `
    <h2 class="section-title">Lab Results</h2>
    ${rows ? `<div class="table-wrap">${table(headers, rows)}</div>` : emptyState("조회된 Lab 기록이 없습니다.")}
  `);
}

function withReference(lab) {
  if (lab.referenceText || !labReferenceMaster?.items) return lab;
  const ref = labReferenceMaster.items[lab.item];
  if (!ref) return lab;
  const result = Number(lab.result);
  const flag = lab.flag || (Number.isFinite(result) ? computeFlag(result, ref.refLow, ref.refHigh) : "");
  return {
    ...lab,
    unit: lab.unit || ref.unit,
    refLow: lab.refLow ?? ref.refLow,
    refHigh: lab.refHigh ?? ref.refHigh,
    referenceText: lab.referenceText || ref.referenceText,
    flag
  };
}

function computeFlag(result, low, high) {
  if (typeof low === "number" && result < low) return "L";
  if (typeof high === "number" && result > high) return "H";
  return "";
}

function renderLabCell(lab) {
  if (!lab) return `<td></td>`;
  const flag = lab.flag && lab.flag !== "N" ? String(lab.flag).toUpperCase() : "";
  return `<td class="${labFlagClass(flag)}">${escapeHtml(lab.displayResult ?? lab.result ?? EMPTY_TEXT)}${flag ? `<span class="flag">${escapeHtml(flag)}</span>` : ""}</td>`;
}

function labFlagClass(flag) {
  if (flag === "HH" || flag === "LL") return "lab-flag-critical";
  if (flag === "H") return "lab-flag-h";
  if (flag === "L") return "lab-flag-l";
  return "";
}

function trendForLabs(labs) {
  const numeric = labs.filter(Boolean).map((lab) => Number(lab.result)).filter(Number.isFinite);
  if (numeric.length < 2) return "";
  const first = numeric[0];
  const last = numeric[numeric.length - 1];
  if (last > first) return "↑";
  if (last < first) return "↓";
  return "→";
}

function renderDiagnostics(diagnosticTests, procedures, surgicalHistory) {
  const diagnosticRows = diagnosticTests.map((test) => `
    <tr>
      <td>${escapeHtml(formatDateTime(test.dateTime || test.date || ""))}</td>
      <td>${escapeHtml(test.testType || "")}</td>
      <td>${escapeHtml(test.testName || EMPTY_TEXT)}</td>
      <td>${escapeHtml(test.summary || test.findings || test.impression || "")}</td>
      <td>${escapeHtml(test.status || "")}</td>
    </tr>
  `).join("");
  const imagePanels = diagnosticTests.map(renderDiagnosticImages).filter(Boolean).join("");
  const procedureRows = [...procedures, ...surgicalHistory].map((item) => typeof item === "object" ? `
    <tr>
      <td>${escapeHtml(formatDateTime(item.dateTime || item.date || ""))}</td>
      <td>${escapeHtml(item.procedureName || item.procedure || item.name || EMPTY_TEXT)}</td>
      <td>${escapeHtml(item.details || item.note || item.summary || "")}</td>
    </tr>
  ` : `
    <tr>
      <td></td>
      <td>${escapeHtml(item || EMPTY_TEXT)}</td>
      <td></td>
    </tr>
  `).join("");

  setHtml("diagnostics", `
    <h2 class="section-title">영상/진단검사</h2>
    ${diagnosticRows ? table(["Date", "Type", "Name", "Summary", "Status"], diagnosticRows) : emptyState("조회된 진단검사 기록이 없습니다.")}
    ${imagePanels}
    <h3 class="subhead">Procedures</h3>
    ${procedureRows ? table(["Date", "Procedure", "Details"], procedureRows) : emptyState("조회된 시술/수술 기록이 없습니다.")}
  `);
}

function renderDiagnosticImages(test) {
  const images = Array.isArray(test.images) ? test.images : [];
  if (!images.length) return "";
  const title = joinParts([test.testName, test.testType, test.timing || test.date], " · ");
  return `
    <div class="panel">
      <h3 class="panel-title">${escapeHtml(title || "검사 이미지")}</h3>
      <div class="panel-body image-grid">
        ${images.map((image) => `
          <figure class="diagnostic-image">
            <img src="${escapeAttrPath(image.imageUrl || "")}" alt="${escapeHtml(image.altText || image.caption || test.testName || "diagnostic image")}">
            <figcaption>${escapeHtml(image.caption || image.fileName || "")}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHomeMedications(meds) {
  const rows = meds.map((med) => `
    <tr>
      <td>${escapeHtml(med.drugName || EMPTY_TEXT)}</td>
      <td>${escapeHtml(med.dose || "")}</td>
      <td>${escapeHtml(med.route || "")}</td>
      <td>${escapeHtml(med.frequency || "")}</td>
      <td>${escapeHtml(med.schedule || "")}</td>
      <td>${escapeHtml(med.indication || "")}</td>
      <td>${escapeHtml(med.adherence || "")}</td>
      <td>${escapeHtml(med.lastTaken || "")}</td>
      <td>${escapeHtml(med.note || "")}</td>
    </tr>
  `).join("");
  setHtml("homeMeds", `
    <h2 class="section-title">Home Medications</h2>
    ${rows ? table(["약물명", "용량", "경로", "빈도", "복용시간", "적응증", "순응도", "마지막 복용", "비고"], rows) : emptyState("조회된 기존 복용약 기록이 없습니다.")}
  `);
}

function renderMedicationIdentification(items) {
  const rows = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.reportedMedication || item.drugName || EMPTY_TEXT)}</td>
      <td>${escapeHtml(item.identifiedDrug || EMPTY_TEXT)}</td>
      <td>${escapeHtml(item.strength || item.dose || "")}</td>
      <td>${escapeHtml(item.dosageForm || "")}</td>
      <td>${escapeHtml(item.appearance || EMPTY_TEXT)}</td>
      <td>${escapeHtml(booleanText(item.matchedToHomeMedicationList))}</td>
      <td>${escapeHtml(item.verificationStatus || "")}</td>
      <td>${escapeHtml(isDevPlaceholderNote(item.note) ? "" : (item.note || ""))}</td>
    </tr>
  `).join("");
  setHtml("medId", `
    <h2 class="section-title">Medication Identification</h2>
    ${rows ? table(["보고 약물명", "식별 결과", "함량", "제형", "외형", "목록 일치", "확인상태", "비고"], rows) : emptyState("조회된 약물 식별 기록이 없습니다.")}
  `);
}

function renderMedicationReconciliation(items) {
  const rows = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.drugName || EMPTY_TEXT)}</td>
      <td>${escapeHtml(joinParts([item.homeDose, item.homeRoute, item.homeFrequency]))}</td>
      <td>${escapeHtml(joinParts([item.dischargeDose, item.dischargeRoute, item.dischargeFrequency]))}</td>
      <td><span class="status-pill ${escapeAttr(item.reconciliationStatus || "")}">${escapeHtml(item.reconciliationStatus || EMPTY_TEXT)}</span></td>
      <td>${escapeHtml(item.verificationStatus || "")}</td>
      <td>${escapeHtml(item.note || "")}</td>
    </tr>
  `).join("");
  setHtml("medRec", `
    <h2 class="section-title">Medication Reconciliation</h2>
    ${rows ? table(["약물명", "기존 복용", "퇴원 약물", "상태", "확인상태", "비고"], rows) : emptyState("조회된 Medication Reconciliation 기록이 없습니다.")}
  `);
}

function renderMedicationOrders(orders) {
  const rows = orders.map((order) => `
    <tr>
      <td class="nowrap">${escapeHtml(order.orderId || "")}</td>
      <td class="nowrap">${escapeHtml(formatDateTime(order.orderDateTime || order.orderDate || ""))}</td>
      <td class="nowrap">${escapeHtml(order.orderType || "")}</td>
      <td class="nowrap">${escapeHtml(order.drugName || EMPTY_TEXT)}</td>
      <td class="nowrap">${escapeHtml(order.dose || "")}</td>
      <td class="nowrap">${escapeHtml(order.route || "")}</td>
      <td class="nowrap">${escapeHtml(order.frequency || "")}</td>
      <td class="nowrap">${escapeHtml(order.duration || "")}</td>
      <td class="nowrap">${escapeHtml(order.status || "")}</td>
      <td class="nowrap">${escapeHtml(order.prescriber || "")}</td>
      <td>${escapeHtml(isDevPlaceholderNote(order.note) ? "" : (order.note || ""))}</td>
    </tr>
  `).join("");
  setHtml("orders", `
    <h2 class="section-title">Orders</h2>
    ${rows ? `<div class="table-wrap orders-table">${table(["Order ID", "Order Date", "Type", "약물명", "용량", "경로", "빈도", "기간", "상태", "처방의", "비고"], rows)}</div>` : emptyState("조회된 처방오더 기록이 없습니다.")}
  `);
}

function renderMAR(mar) {
  const records = mar.records || [];
  const rows = records.map((record) => `
    <tr>
      <td>${escapeHtml(formatDateTime(record.dateTime || record.administeredAt || ""))}</td>
      <td>${escapeHtml(record.drugName || EMPTY_TEXT)}</td>
      <td>${escapeHtml(record.dose || "")}</td>
      <td>${escapeHtml(record.route || "")}</td>
      <td>${escapeHtml(record.scheduledTime || "")}</td>
      <td>${escapeHtml(record.status || "")}</td>
      <td>${escapeHtml(record.administeredBy || "")}</td>
      <td>${escapeHtml(record.omissionReason || "")}</td>
      <td>${escapeHtml(record.note || "")}</td>
    </tr>
  `).join("");
  setHtml("mar", `
    <h2 class="section-title">MAR</h2>
    ${records.length ? table(["투약일시", "약물명", "용량", "경로", "예정시각", "상태", "투약자", "미투약 사유", "비고"], rows) : emptyState(mar.displayMessage || "해당 기간 투약기록 없음")}
  `);
}

function renderDischargeMedications(meds) {
  const rows = meds.map((med) => `
    <tr>
      <td>${escapeHtml(med.drugName || EMPTY_TEXT)}</td>
      <td>${escapeHtml(med.dose || "")}</td>
      <td>${escapeHtml(med.route || "")}</td>
      <td>${escapeHtml(med.frequency || "")}</td>
      <td>${escapeHtml(med.duration || "")}</td>
      <td>${escapeHtml(med.schedule || "")}</td>
      <td>${escapeHtml(med.changeFromHomeMed || "")}</td>
      <td>${escapeHtml(med.indication || "")}</td>
      <td>${escapeHtml(med.note || "")}</td>
    </tr>
  `).join("");
  setHtml("dischargeMeds", `
    <h2 class="section-title">Discharge Medications</h2>
    ${rows ? table(["약물명", "용량", "경로", "빈도", "기간", "복용시간", "기존약 대비", "적응증", "메모"], rows) : emptyState("조회된 퇴원약 기록이 없습니다.")}
  `);
}

function renderPharmacyReviewRequests(requests, consultations) {
  const requestHtml = requests.map((request) => `
    <div class="panel">
      <h3 class="panel-title">${escapeHtml(request.requestType || "약사 검토 요청")} ${request.dateTime || request.date ? `· ${escapeHtml(formatDateTime(request.dateTime || request.date))}` : ""}</h3>
      <div class="panel-body">${textBlock(request.freeText || request.note || request.summary)}</div>
    </div>
  `).join("");
  const consultRows = consultations.map((consult) => `
    <tr>
      <td>${escapeHtml(formatDateTime(consult.dateTime || consult.date || ""))}</td>
      <td>${escapeHtml(consult.department || "")}</td>
      <td>${escapeHtml(consult.reason || consult.request || "")}</td>
      <td>${escapeHtml(consult.recommendation || consult.note || "")}</td>
    </tr>
  `).join("");
  setHtml("pharmacy", `
    <h2 class="section-title">약사 검토 요청</h2>
    ${requestHtml || emptyState("조회된 약사 검토 요청이 없습니다.")}
    <h3 class="subhead">Consultations</h3>
    ${consultRows ? table(["Date", "Department", "Reason", "Recommendation"], consultRows) : emptyState("조회된 협진 기록이 없습니다.")}
  `);
}

function renderRightSummary(patient) {
  const latestVital = sortByDate(patient.vitalSigns || []).at(-1);
  const abnormalLabs = (patient.labResults || []).filter((lab) => lab.flag && lab.flag !== "N").length;
  const allergies = allergiesText(patient.patientHeader?.allergies);
  els.rightSummary.innerHTML = `
    <h2>Chart Summary</h2>
    <div class="summary-metric"><span>최근 Vital</span><strong>${escapeHtml(latestVital ? formatVitalBrief(latestVital) : EMPTY_TEXT)}</strong></div>
    <div class="summary-metric"><span>Lab 이상 표시</span><strong>${abnormalLabs}</strong></div>
    <div class="summary-metric"><span>Problem</span><strong>${(patient.problemList || []).length}</strong></div>
    <div class="summary-metric"><span>퇴원약</span><strong>${(patient.dischargeMedications || []).length}</strong></div>
    <div class="summary-metric"><span>Allergy</span><strong>${escapeHtml(allergies)}</strong></div>
    <div class="summary-metric"><span>입원/퇴원예정</span><strong>${escapeHtml(joinParts([patient.hospitalRecord?.admissionDate, patient.hospitalRecord?.plannedDischargeDate], " / ") || EMPTY_TEXT)}</strong></div>
  `;
}

function setHtml(id, html) {
  const target = document.getElementById(id);
  if (target) target.innerHTML = html;
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function arrayTable(items, keys, labels) {
  if (!items.length) return emptyState("조회된 기록이 없습니다.");
  const rows = items.map((item) => {
    if (item === null || typeof item !== "object") {
      return `<tr><td colspan="${labels.length}">${escapeHtml(formatAny(item))}</td></tr>`;
    }
    return `<tr>${keys.map((key) => `<td>${escapeHtml(formatAny(item?.[key]))}</td>`).join("")}</tr>`;
  }).join("");
  return table(labels, rows);
}

function objectGrid(object) {
  const entries = Object.entries(object || {}).filter(([key]) => key !== "sourceLevel");
  if (!entries.length) return emptyState("조회된 기록이 없습니다.");
  return `<div class="grid">${entries.map(([key, val]) => kv(labelize(key), formatAny(val))).join("")}</div>`;
}

function kv(label, val) {
  return `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatAny(val))}</strong></div>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message || EMPTY_TEXT)}</div>`;
}

function textBlock(text) {
  return text ? `<div class="note-block">${escapeHtml(text)}</div>` : emptyState(EMPTY_TEXT);
}

function value(input) {
  return escapeHtml(formatAny(input));
}

function formatAny(input) {
  if (input === null || input === undefined || input === "") return EMPTY_TEXT;
  if (Array.isArray(input)) return input.map(formatAny).join(", ");
  if (typeof input === "object") {
    return Object.entries(input)
      .filter(([key]) => key !== "sourceLevel")
      .map(([key, val]) => `${labelize(key)}: ${formatAny(val)}`)
      .join("; ");
  }
  return String(input);
}

function formatReference(lab) {
  if (lab.refLow !== undefined && lab.refHigh !== undefined && lab.refLow !== "" && lab.refHigh !== "") {
    return `${lab.refLow}-${lab.refHigh}${lab.unit ? ` ${lab.unit}` : ""}`;
  }
  return "";
}

function formatDateTime(input) {
  if (!input) return "";
  return String(input).replace("T", " ").replace("+09:00", "");
}

function formatVitalBrief(vital) {
  return joinParts([
    vital.bp,
    vital.hr ? `HR ${vital.hr}` : "",
    vital.rr ? `RR ${vital.rr}` : "",
    vital.spo2 ? `SpO2 ${vital.spo2}%` : "",
    vital.weightKg ? `BW ${vital.weightKg}kg` : ""
  ]);
}

function sortByDate(items) {
  return [...items].sort((a, b) => {
    const left = new Date(a.dateTime || a.date || a.orderDateTime || a.orderDate || 0).getTime();
    const right = new Date(b.dateTime || b.date || b.orderDateTime || b.orderDate || 0).getTime();
    return left - right;
  });
}

function vitalClass(vital, field) {
  if (field === "bp" && (vital.bpFlag === "H" || vital.sbp >= 140 || vital.dbp >= 90)) return "lab-flag-h";
  if (field === "hr" && (vital.heartRateFlag === "H" || vital.hr > 100)) return "lab-flag-h";
  if (field === "rr" && vital.rr > 20) return "lab-flag-h";
  if (field === "spo2" && (vital.spo2Flag === "L" || vital.spo2 < 92)) return "lab-flag-l";
  return "";
}

function allergiesText(allergies) {
  if (!Array.isArray(allergies) || !allergies.length) return EMPTY_TEXT;
  return allergies.map((item) => item.substance || item.name || formatAny(item)).join(", ");
}

function booleanText(value) {
  if (value === true) return "예";
  if (value === false) return "아니오";
  return EMPTY_TEXT;
}

function joinParts(parts, separator = " · ") {
  return parts.filter((part) => part !== null && part !== undefined && part !== "").join(separator);
}

function labelize(key) {
  return String(key).replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function escapeHtml(input) {
  return String(input ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(input) {
  return String(input ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function escapeAttrPath(input) {
  return String(input ?? "").replace(/["'<>\s]/g, "");
}
function isDevPlaceholderNote(note) {
  if (!note || typeof note !== "string") return false;
  const s = note.trim();
  if (!s) return false;
  const patterns = [/원자료/, /Current\s*Medications/i];
  return patterns.some((p) => p.test(s));
}
