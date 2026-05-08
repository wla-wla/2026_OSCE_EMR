// Your web app's Firebase configuration 
// const firebaseConfig = {
//     apiKey: "apikey",
//     authDomain: "osce-32198.firebaseapp.com",
//     projectId: "osce-32198",
//     storageBucket: "osce-32198.firebasestorage.app",
//     messagingSenderId: "547431031619",
//     appId: "1:547431031619:web:d4d4c56ac140714de345f6",
//     databaseURL: "https://osce-32198-default-rtdb.asia-southeast1.firebasedatabase.app/",
// };

// ---------------------------------------------------------------------------------
// import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
//   import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
//   // TODO: Add SDKs for Firebase products that you want to use
//   // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCETgjHq6B0tU3ds0JObJ_W0a9xlhjIpFg",
    authDomain: "emr-3b199.firebaseapp.com",
    projectId: "emr-3b199",
    storageBucket: "emr-3b199.firebasestorage.app",
    messagingSenderId: "168094069027",
    appId: "1:168094069027:web:b7d53c5e0887214f939c96",
    databaseURL: "https://emr-3b199-default-rtdb.asia-southeast1.firebasedatabase.app/"
    //measurementId: "G-1W7TBGTCMT"
  };

//   // Initialize Firebase
//   const app = initializeApp(firebaseConfig);
//   const analytics = getAnalytics(app);



// ---------------------------------------------------------------------------------
// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM 요소 가져오기
const patientIdInput = document.getElementById('patientIdInput');
const searchPatientBtn = document.getElementById('searchPatientBtn');
const patientMenu = document.getElementById('patientMenu');
const sidebarPatientInfo = document.getElementById('sidebarPatientInfo');

// 콘텐츠 섹션 ID 배열
const contentSectionIds = [
    'initialMessage', 'demographics', 'visitHistorySummary', 
    'labResultSummary', 'med_history', 'admissionHistory', 
    'comprehensivePastHistory', 'patientNotFoundMessage'
];

let currentLoadedPatientData = null;

// 초기 UI 상태 설정 함수
function setInitialUIState(clearPatientInfo = true) {
    contentSectionIds.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.classList.remove('active');
    });
    const initialMsgSection = document.getElementById('initialMessage');
    if (initialMsgSection) initialMsgSection.classList.add('active');
    
    if (patientMenu) patientMenu.classList.add('disabled-menu');
    
    if (clearPatientInfo && sidebarPatientInfo) {
        sidebarPatientInfo.style.display = 'none';
        sidebarPatientInfo.textContent = '';
    }

    document.getElementById('demographicsContent').innerHTML = '';
    document.getElementById('diagnosisList').innerHTML = '';
    document.getElementById('visitHistorySummaryContent').innerHTML = '';
    document.getElementById('labResultSummaryContent').innerHTML = '';
    document.getElementById('medHistoryContent').innerHTML = '';
    document.getElementById('admissionHistoryContent').innerHTML = '';
    document.getElementById('comprehensivePastHistoryContent').innerHTML = '';
}

// 페이지 로드 시 초기 UI 상태 설정
document.addEventListener('DOMContentLoaded', () => {
    setInitialUIState();
    if (searchPatientBtn) searchPatientBtn.addEventListener('click', searchPatient);
    if (patientIdInput) patientIdInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') searchPatient(); });

    const menuItems = patientMenu.querySelectorAll('li');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!patientMenu.classList.contains('disabled-menu') && currentLoadedPatientData) {
                showSection(this.dataset.section, this);
            }
        });
    });
});

/**
 * 환자 ID로 Firebase에서 환자 정보를 검색하고 화면에 표시합니다.
 */
function searchPatient() {
    const patientId = patientIdInput.value.trim().toUpperCase();
    if (!patientId) {
        alert('환자 ID를 입력해주세요.');
        return;
    }
    setInitialUIState(); 
    currentLoadedPatientData = null;

    const patientRef = database.ref('patients/' + patientId);
    patientRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            currentLoadedPatientData = snapshot.val();
            displayAllPatientDataSections(currentLoadedPatientData, patientId); 
            if (patientMenu) patientMenu.classList.remove('disabled-menu');
            
            const demoMenuItem = patientMenu.querySelector('li[data-section="demographics"]');
            if (demoMenuItem) showSection('demographics', demoMenuItem);
        } else {
            displayPatientNotFound();
        }
    }).catch((error) => {
        console.error("Firebase 데이터 읽기 오류:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다: " + error.message);
        displayPatientNotFound();
    });
}

/**
 * 검색된 환자의 모든 정보를 각 해당 섹션에 미리 채워 넣습니다.
 */
function displayAllPatientDataSections(patientData, searchedPatientId) {
    if (sidebarPatientInfo) {
        sidebarPatientInfo.textContent = `${patientData.demographics?.name || '이름 없음'} (${searchedPatientId})`;
        sidebarPatientInfo.style.display = 'block';
    }

    if (patientData.demographics) displayDemographics(patientData.demographics);
    
    if (patientData.visitHistory && patientData.visitHistory.length > 0) {
        displayAllVisits(patientData.visitHistory, 'visitHistorySummaryContent');
        
        const admissionSectionContent = document.getElementById('admissionHistoryContent');
        admissionSectionContent.innerHTML = ''; 
        const admissions = patientData.visitHistory.filter(visit => 
            visit.visitType && (visit.visitType.includes('입원') || visit.visitType.includes('응급실') || visit.visitType.includes('항암주사')) || visit.procedureRecord || visit.dischargeNote || visit.physicalExamOnAdmission
        );
        if (admissions.length > 0) {
            const sortedAdmissions = [...admissions].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
            sortedAdmissions.forEach(admission => displaySingleVisit(admission, 'admissionHistoryContent', admission.visitType || '기록', true));
        } else {
            admissionSectionContent.innerHTML = '<p>입원/시술 관련 기록이 없습니다.</p>';
        }
    } else {
        document.getElementById('visitHistorySummaryContent').innerHTML = '<p>방문 기록이 없습니다.</p>';
        document.getElementById('admissionHistoryContent').innerHTML = '<p>입원/시술 관련 기록이 없습니다.</p>';
    }
    
    if (patientData.labRecords && patientData.labRecords.length > 0) {
        displayAllLabRecords(patientData.labRecords, 'labResultSummaryContent'); 
    } else {
         document.getElementById('labResultSummaryContent').innerHTML = '<p>검사 기록이 없습니다.</p>';
    }

    if (patientData.medHistory) displayMedHistory(patientData.medHistory);
    
    const comprehensiveDiv = document.getElementById('comprehensivePastHistoryContent');
    let comprehensiveHtml = ''; 
    
    if (patientData.pastHistory) { 
        comprehensiveHtml += getPastHistoryHtml(patientData.pastHistory);
    }
    if (patientData.pastMedicalHistory || patientData.familyHistory) { 
        comprehensiveHtml += getDetailedPastHistoryHtml(patientData); 
    }
    if (patientData.imagingResults) {
        comprehensiveHtml += getImagingResultsHtml(patientData.imagingResults);
    }
    if (patientData.geneticPanel) {
        comprehensiveHtml += getGeneticPanelHtml(patientData.geneticPanel);
    }
     if (patientData.otherProcedures) { 
        comprehensiveHtml += getOtherProceduresHtml(patientData.otherProcedures);
    }
    if (patientData.vitalSignsRecords) { 
        comprehensiveHtml += getVitalSignsRecordsHtml(patientData.vitalSignsRecords);
    }
    if (patientData.consultations) { 
        comprehensiveHtml += getConsultationsHtml(patientData.consultations);
    }
    if (patientData.osceStudentObjectives) { 
        comprehensiveHtml += getOsceObjectivesHtml(patientData.osceStudentObjectives);
    }

    if (comprehensiveHtml.trim() === '') { 
        comprehensiveDiv.innerHTML = '<p>관련 기록이 없습니다.</p>';
    } else {
        comprehensiveDiv.innerHTML = comprehensiveHtml;
    }
}

/**
 * 모든 방문 기록을 특정 div에 표시하는 함수
 */
function displayAllVisits(visitsArray, targetDivId) {
    const contentDiv = document.getElementById(targetDivId);
    if (!contentDiv) return;
    contentDiv.innerHTML = ''; 

    if (!visitsArray || visitsArray.length === 0) {
        contentDiv.innerHTML = '<p>방문 기록이 없습니다.</p>';
        return;
    }
    const sortedVisits = [...visitsArray].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    
    sortedVisits.forEach(visit => {
        displaySingleVisit(visit, targetDivId, visit.visitType || "방문 기록", true);
    });
}

/**
 * 모든 날짜의 검사 결과를 표 형태로 표시합니다.
 */
function displayAllLabRecords(labRecordsArray, targetDivId) {
    const contentDiv = document.getElementById(targetDivId);
    if (!contentDiv) return;
    contentDiv.innerHTML = ''; 

    if (!labRecordsArray || labRecordsArray.length === 0) {
        contentDiv.innerHTML = '<p>검사 기록이 없습니다.</p>';
        return;
    }

    const sortedLabs = [...labRecordsArray].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedLabs.forEach(labsData => {
        displaySingleLabRecord(labsData, targetDivId, "검사 결과", true);
    });
}

// --- 각 섹션별 데이터 표시 함수들 ---

function displaySingleVisit(visitData, targetDivId, titlePrefix = "방문 기록", append = false) {
    const contentDiv = document.getElementById(targetDivId);
    if (!contentDiv) return;

    let visitHtml = `<div class="visit-entry">
            <h3>${titlePrefix} (${visitData.visitDate || '날짜 없음'}) - ${visitData.department || '과 정보 없음'}</h3>
            ${visitData.visitType ? `<p><strong>방문 유형:</strong> ${visitData.visitType}</p>` : ''}
            ${visitData.reasonForVisit ? `<p><strong>방문 사유:</strong> ${visitData.reasonForVisit}</p>` : ''}
            ${visitData.chiefComplaint ? `<h4>주호소 (CC):</h4><p>${visitData.chiefComplaint.replace(/\n/g, '<br>')}</p>` : ''}
            ${visitData.historyOfPresentIllness ? `<h4>현병력 (HPI):</h4><p>${visitData.historyOfPresentIllness.replace(/\n/g, '<br>')}</p>` : ''}
    `;
    if (visitData.physicalExam) { 
        visitHtml += '<h4>신체 검사:</h4><div class="info-grid">';
        for (const key in visitData.physicalExam) {
            let value = visitData.physicalExam[key];
            let displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (typeof value === 'object' && value !== null) { 
                let subItems = [];
                for (const subKey in value) {
                    subItems.push(`${subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value[subKey]}`);
                }
                visitHtml += `<div class="info-item"><strong>${displayKey}:</strong> ${subItems.join('; ')}</div>`;
            } else {
                 visitHtml += `<div class="info-item"><strong>${displayKey}:</strong> ${value}</div>`;
            }
        }
        visitHtml += '</div>';
    }
    if (visitData.physicalExamOnAdmission) { 
        visitHtml += `<h4>입원 시 신체 검사 (${visitData.physicalExamOnAdmission.dateTime || visitData.visitDate || ''}):</h4><div class="info-grid">`;
        visitHtml += `<div class="info-item"><strong>일반 상태:</strong> ${visitData.physicalExamOnAdmission.generalAppearance || 'N/A'}</div>`;
        if(visitData.physicalExamOnAdmission.height) visitHtml += `<div class="info-item"><strong>신장:</strong> ${visitData.physicalExamOnAdmission.height}</div>`;
        if(visitData.physicalExamOnAdmission.weight) visitHtml += `<div class="info-item"><strong>체중:</strong> ${visitData.physicalExamOnAdmission.weight}</div>`;
        if(visitData.physicalExamOnAdmission.vitalSigns){
            for(const vsKey in visitData.physicalExamOnAdmission.vitalSigns){
                visitHtml += `<div class="info-item"><strong>${vsKey.toUpperCase()}:</strong> ${visitData.physicalExamOnAdmission.vitalSigns[vsKey]}</div>`;
            }
        }
        visitHtml += `<div class="info-item"><strong>HEENT:</strong> ${visitData.physicalExamOnAdmission.heent || 'N/A'}</div>`;
        visitHtml += `<div class="info-item"><strong>Chest:</strong> ${visitData.physicalExamOnAdmission.chest || 'N/A'}</div>`;
        visitHtml += `<div class="info-item"><strong>Abdomen:</strong> ${visitData.physicalExamOnAdmission.abdomen || 'N/A'}</div>`;
        visitHtml += `<div class="info-item"><strong>Extremities:</strong> ${visitData.physicalExamOnAdmission.extremities || 'N/A'}</div>`;
        visitHtml += `<div class="info-item"><strong>Neuro:</strong> ${visitData.physicalExamOnAdmission.neuro || 'N/A'}</div>`;
        visitHtml += '</div>';
    }
    if (visitData.ros) {
        visitHtml += '<h4>Review of Systems (ROS):</h4><div class="info-grid">';
        for (const key in visitData.ros) {
            visitHtml += `<div class="info-item"><strong>${key.toUpperCase()}:</strong> ${visitData.ros[key]}</div>`;
        }
        visitHtml += '</div>';
    }
    if (visitData.procedure) { 
        visitHtml += `<p><strong>시술명:</strong> ${visitData.procedure}</p>`;
    }
    if (visitData.procedureRecord && visitData.procedureRecord.procedureName) { 
        visitHtml += `<h4>시술/수술 기록:</h4><p><strong>${visitData.procedureRecord.procedureName}</strong></p>`;
        if(visitData.procedureRecord.note) visitHtml += `<p>${visitData.procedureRecord.note}</p>`;
    }
    if (visitData.dischargeNote) { 
        visitHtml += `<div class="physician-note"><strong>퇴원 기록:</strong><br>${visitData.dischargeNote.replace(/\n/g, '<br>')}</div>`;
    }
    if (visitData.physicianNote) {
        visitHtml += `<div class="physician-note"><strong>의사 소견:</strong><br>${visitData.physicianNote.replace(/\n/g, '<br>')}</div>`;
    }
     if (visitData.vitalSignsOverTime && visitData.vitalSignsOverTime.length > 0) { 
        visitHtml += '<h4>시간별 활력징후 (해당 방문 중):</h4><table><thead><tr><th>시간</th><th>혈압(BP)</th><th>맥박(HR)</th><th>호흡(RR)</th><th>체온(BT)</th><th>SpO2</th><th>산소장치</th><th>체중</th></tr></thead><tbody>';
        visitData.vitalSignsOverTime.forEach(vital => {
            visitHtml += `<tr>
                            <td>${vital.time || 'N/A'}</td>
                            <td>${vital.bp || 'N/A'}</td>
                            <td>${vital.hr || 'N/A'}</td>
                            <td>${vital.rr || 'N/A'}</td>
                            <td>${vital.bt || 'N/A'}</td>
                            <td>${vital.spO2 || 'N/A'}</td>
                            <td>${vital.o2Device || 'N/A'}</td>
                            <td>${vital.weight || 'N/A'}</td> 
                         </tr>`;
        });
        visitHtml += '</tbody></table>';
    }
    if (visitData.summaryOfProgressAsOf20250514) { 
         visitHtml += `<h4>경과 요약 (${visitData.visitDate} 기준):</h4><p>${visitData.summaryOfProgressAsOf20250514.replace(/\n/g, '<br>')}</p>`;
    }
    visitHtml += `</div>`;

    if (append) {
        if (contentDiv.innerHTML.includes('<p>방문 기록이 없습니다.</p>')) {
            contentDiv.innerHTML = visitHtml;
        } else {
            contentDiv.innerHTML += visitHtml;
        }
    } else {
        contentDiv.innerHTML = visitHtml;
    }
}

function displayDemographics(demoData) {
    const contentDiv = document.getElementById('demographicsContent');
    contentDiv.innerHTML = ''; 

    let demoGridHtml = `
        <div class="info-item"><strong>환자명:</strong> ${demoData.name || 'N/A'}</div>
        <div class="info-item"><strong>환자 ID:</strong> ${demoData.patientIdDisplay || 'N/A'}</div>
        ${demoData.birthDate ? `<div class="info-item"><strong>생년월일:</strong> ${demoData.birthDate}</div>` : ''}
        <div class="info-item"><strong>나이/성별:</strong> ${demoData.ageGender || 'N/A'}</div>
        <div class="info-item"><strong>알레르기:</strong> ${demoData.allergy || 'N/A'}</div>
        <div class="info-item"><strong>흡연력:</strong> ${demoData.smoking || 'N/A'}</div>
        <div class="info-item"><strong>음주력:</strong> ${demoData.drinking || 'N/A'}</div>
        <div class="info-item"><strong>직업:</strong> ${demoData.occupation || 'N/A'}</div>
    `;
    if(demoData.gestationalAge) demoGridHtml += `<div class="info-item"><strong>재태주령:</strong> ${demoData.gestationalAge}</div>`;
    if(demoData.birthWeight) demoGridHtml += `<div class="info-item"><strong>출생체중:</strong> ${demoData.birthWeight}</div>`;
    if(demoData.apgarScores) demoGridHtml += `<div class="info-item"><strong>APGAR 점수:</strong> ${demoData.apgarScores}</div>`;
    if(demoData.admissionDateTime) demoGridHtml += `<div class="info-item"><strong>입원일시:</strong> ${demoData.admissionDateTime}</div>`;
    if(demoData.admissionWeight) demoGridHtml += `<div class="info-item"><strong>입원시 체중:</strong> ${demoData.admissionWeight}</div>`;
    if(demoData.admissionHeight) demoGridHtml += `<div class="info-item"><strong>입원시 신장:</strong> ${demoData.admissionHeight}</div>`;
    if(demoData.lastOPDWeight) demoGridHtml += `<div class="info-item"><strong>최근외래 체중:</strong> ${demoData.lastOPDWeight}</div>`;
    if(demoData.lastOPDHeight) demoGridHtml += `<div class="info-item"><strong>최근외래 신장:</strong> ${demoData.lastOPDHeight}</div>`;

    contentDiv.innerHTML = demoGridHtml;

    if (demoData.socialNotes && demoData.socialNotes.length > 0) {
        let socialHtml = '<div class="info-item social-notes-item"><h4>사회력 참고사항</h4><ul>';
        demoData.socialNotes.forEach(note => socialHtml += `<li>${note}</li>`);
        socialHtml += '</ul></div>';
        contentDiv.insertAdjacentHTML('beforeend', socialHtml);
    }

    const diagnosisList = document.getElementById('diagnosisList');
    diagnosisList.innerHTML = '';
    if (demoData.diagnosis && demoData.diagnosis.length > 0) {
        demoData.diagnosis.forEach(diag => {
            const li = document.createElement('li');
            li.textContent = diag;
            diagnosisList.appendChild(li);
        });
    } else {
        diagnosisList.innerHTML = '<li>진단 정보 없음</li>';
    }
}

function displaySingleLabRecord(labsData, targetDivId, titlePrefix = "검사 결과", append = false) {
    const contentDiv = document.getElementById(targetDivId);
    if (!contentDiv) return;
    
    let labHtml = ''; 
    let hasAnyContentForThisDateEntry = false; // 이 labRecords 항목 내에 표시할 내용이 있는지

    if (!labsData) {
        labHtml = '<p>검사 기록이 없습니다.</p>';
        if (append && contentDiv.innerHTML.includes('<p>검사 기록이 없습니다.</p>')) {} 
        else if (append) contentDiv.innerHTML += labHtml;
        else contentDiv.innerHTML = labHtml;
        return;
    }
    
    if (append && contentDiv.innerHTML.includes('<p>검사 기록이 없습니다.</p>')) {
        contentDiv.innerHTML = '';
    }

    labHtml += `<div class="lab-record-entry">`;
    labHtml += `<h3>${titlePrefix} (${labsData.date || '날짜 정보 없음'}) ${labsData.type ? ` - ${labsData.type}` : ''}</h3>`;

    const labSections = {
        "일반혈액검사 (CBC)": labsData.cbc,
        "일반화학검사 (Chemistry)": labsData.chemistry,
        "동맥혈가스분석 (ABGA)": labsData.abga, 
        "염증표지자 (Inflammatory Markers)": labsData.inflammatoryMarkers,
        "지질 검사 (Lipids)": labsData.lipids,
        "내분비/특수 검사 (Endo/Special)": labsData.endoSpecial,
        "종양표지자 (Tumor Markers)": labsData.tumorMarkers,
        "대변 검사 (Stool Exam)": labsData.stoolExam,
        "심장표지자 (Cardiac Marker)": labsData.cardiacMarker,
        "배양 검사 (Cultures)": labsData.cultures 
    };

    for (const sectionTitle in labSections) {
        const labItems = labSections[sectionTitle];
        if (labItems && labItems.length > 0) {
            hasAnyContentForThisDateEntry = true;
            labHtml += `<h4>${sectionTitle}</h4>`;
            labHtml += '<table><thead><tr><th>항목</th><th>결과</th><th>단위</th><th>참고치</th></tr></thead><tbody>';
            labItems.forEach(item => {
                labHtml += `<tr>
                                <td>${item.item || 'N/A'}</td>
                                <td>${item.result === null || item.result === undefined ? 'N/A' : item.result} ${item.status ? `(${item.status})` : ''}</td>
                                <td>${item.unit || 'N/A'}</td>
                                <td>${item.ref || 'N/A'}</td>
                            </tr>`;
            });
            labHtml += '</tbody></table>';
        }
    }
    if (labsData.urinalysis) { 
        hasAnyContentForThisDateEntry = true;
        labHtml += '<h4>뇨검사 (Urinalysis)</h4>';
        labHtml += '<table><thead><tr><th>항목</th><th>결과</th></tr></thead><tbody>';
        if (Array.isArray(labsData.urinalysis)) { 
            labsData.urinalysis.forEach(uaItem => {
                 labHtml += `<tr><td>${uaItem.item || 'N/A'}</td><td>${uaItem.result === null || uaItem.result === undefined ? 'N/A' : uaItem.result}</td></tr>`;
            });
        } else { 
            for (const key in labsData.urinalysis) {
                if (key === 'proteinHighlight') continue; 
                const value = labsData.urinalysis[key];
                labHtml += `<tr><td>${key.replace('_UA', '')}</td><td>${value}</td></tr>`;
            }
        }
        labHtml += '</tbody></table>';
    }
     // labRecords 내의 vitalSignsOverTime, procedureRecord, dischargeNote 표시는 제거 (visitHistory에서 처리)
    
    if (!hasAnyContentForThisDateEntry) { // 이 날짜의 labRecords 항목에 표시할 검사 결과가 전혀 없으면
        labHtml += '<p>해당 날짜에 상세 검사 결과 항목이 없습니다.</p>';
    }
    labHtml += `</div>`;

    if (append) contentDiv.innerHTML += labHtml; else contentDiv.innerHTML = labHtml;
}

function displayMedHistory(medData) {
    const contentDiv = document.getElementById('medHistoryContent');
    contentDiv.innerHTML = ''; 

    function createMedTable(title, prescriptions) {
        if (!prescriptions || prescriptions.length === 0) {
            return `<p>${title} 정보 없음</p>`;
        }
        let tableHtml = `<h4>${title}</h4> 
                         <table>
                           <thead>
                             <tr>
                               <th>약물명</th><th>용량/경로/상세</th><th>횟수/주기</th>
                               <th>시작일</th><th>종료일(예상)</th><th>처방의</th><th>비고/카테고리</th>
                             </tr>
                           </thead>
                           <tbody>`;
        prescriptions.forEach(med => {
            tableHtml += `<tr>
                            <td>${med.drugName || 'N/A'}</td>
                            <td>${med.dose || ''} ${med.route || ''} ${med.detailForInfusion ? `<small>(${med.detailForInfusion})</small>` : ''}</td>
                            <td>${med.frequency || ''} ${med.schedule || ''}</td>
                            <td>${med.startDate || 'N/A'}</td>
                            <td>${med.endDate || 'N/A'}</td>
                            <td>${med.prescriber || 'N/A'}</td>
                            <td>${med.category ? `<strong>[${med.category}]</strong> ` : ''}${med.note || ''}</td>
                          </tr>`;
        });
        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    if (medData.activePrescriptions) {
        contentDiv.innerHTML += createMedTable('현재 유효 처방', medData.activePrescriptions);
    }
    if (medData.previousPrescriptions) {
        contentDiv.innerHTML += createMedTable('이전 주요 처방', medData.previousPrescriptions);
    }
    if (medData.plannedPrescriptions) {
        contentDiv.innerHTML += createMedTable('예정된 처방', medData.plannedPrescriptions);
    }
}

function getHtmlForAppend(existingHtml, newContentHtml, noDataMessage) {
    if (newContentHtml.trim() !== '') {
        if (existingHtml.includes(noDataMessage)) {
            return newContentHtml; // "정보 없음" 메시지 지우고 새 내용으로
        }
        return existingHtml + newContentHtml; // 기존 내용에 추가
    }
    return existingHtml; // 새 내용 없으면 기존 내용 유지
}

function getPastHistoryHtml(pastData) { 
    let html = '';
    if (!pastData || Object.keys(pastData).length === 0) return '';

    if (pastData.pathology_2015 && pastData.pathology_2015.length > 0) {
        html += '<h4>병리 조직 검사 (2015년 유방암 최초 진단 시)</h4><ul>';
        pastData.pathology_2015.forEach(item => html += `<li>${item}</li>`);
        html += '</ul>';
    }
    if (pastData.geneticPanel_2015 && pastData.geneticPanel_2015.length > 0) { 
        html += '<h4>유전자 패널 검사 (Germline Genetic Panel - 2015년)</h4><ul>';
        pastData.geneticPanel_2015.forEach(item => html += `<li>${item}</li>`);
        html += '</ul>';
    }
    if (pastData.birthRelated) { 
        html += '<h4>출생 관련 정보</h4><div class="info-grid">';
        for(const key in pastData.birthRelated) {
            html += `<div class="info-item"><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${pastData.birthRelated[key]}</div>`;
        }
        html += '</div>';
    }
    if (pastData.previousMedicalConditions && pastData.previousMedicalConditions.length > 0) { 
        html += '<h4>이전 주요 병력 (환자)</h4><ul>';
        pastData.previousMedicalConditions.forEach(item => {
            html += `<li><strong>${item.condition}</strong> (${item.diagnosedDate || '날짜 미상'}): ${item.treatment || ''}</li>`;
        });
        html += '</ul>';
    }
    if (pastData.immunizationHistory) { html += `<p><strong>예방접종력:</strong> ${pastData.immunizationHistory}</p>`;}
    if (pastData.feedingHistory) { html += `<p><strong>수유력:</strong> ${pastData.feedingHistory}</p>`;}
    if (pastData.developmentalHistory) { html += `<p><strong>발달력:</strong> ${pastData.developmentalHistory}</p>`;}
    // P004의 가족력은 pastHistory.familyHistory에 있으므로 여기서 처리
    if (pastData.familyHistory && typeof pastData.familyHistory === 'string' && pastData.familyHistory.trim() !== '') { // P004는 문자열
         html += `<h4>가족력 (Family History)</h4><p>${pastData.familyHistory}</p>`;
    } else if (Array.isArray(pastData.familyHistory) && pastData.familyHistory.length > 0) { // 다른 환자들은 배열
        html += '<h4>가족력 (Family History)</h4><ul>';
        pastData.familyHistory.forEach(item => {
            html += `<li>${item.relation}: ${item.condition}</li>`;
        });
        html += '</ul>';
    }
    return html;
}

function getDetailedPastHistoryHtml(patientData) { 
    let html = '';
    if (!patientData) return '';

    if (patientData.pastMedicalHistory && patientData.pastMedicalHistory.length > 0) {
        html += '<h4>과거 병력 (Past Medical History)</h4><ul>';
        patientData.pastMedicalHistory.forEach(item => {
            html += `<li>${item.date ? `(${item.date}) ` : ''}${item.condition}</li>`;
        });
        html += '</ul>';
    }
    // P004의 가족력은 pastHistory에서 처리했으므로, 여기서는 그 외 환자들의 familyHistory만 처리
    if (patientData.familyHistory && Array.isArray(patientData.familyHistory) && patientData.familyHistory.length > 0 && (!patientData.pastHistory || !patientData.pastHistory.familyHistory)) {
        html += '<h4>가족력 (Family History)</h4><ul>';
        patientData.familyHistory.forEach(item => {
            html += `<li>${item.relation}: ${item.condition}</li>`;
        });
        html += '</ul>';
    }
    return html;
}

function getImagingResultsHtml(imagingDataArray) {
    if (!imagingDataArray || imagingDataArray.length === 0) return '';
    let html = '<h4>영상검사 결과</h4><table><thead><tr><th>검사일</th><th>검사명/구분</th><th>결과 요약</th></tr></thead><tbody>';
    const sortedImaging = [...imagingDataArray].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedImaging.forEach(item => {
        html += `<tr>
                    <td>${item.date || 'N/A'}</td>
                    <td><strong>${item.testName || 'N/A'}</strong><br><small>(${item.category || '구분 없음'})</small></td>
                    <td>${item.summary ? item.summary.replace(/\n/g, '<br>') : 'N/A'}</td>
                 </tr>`;
        if (item.details) { 
            html += `<tr><td colspan="3"><div class="imaging-details"><h5>세부 결과:</h5><ul>`;
            for (const key in item.details) {
                html += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${item.details[key]}</li>`;
            }
            html += `</ul></div></td></tr>`;
        }
    });
    html += '</tbody></table>';
    return html;
}

function getGeneticPanelHtml(geneticData) {
    if (!geneticData) return '';
    let html = '<h4>유전자 검사 결과</h4><ul>';
    if (Array.isArray(geneticData)) { 
        geneticData.forEach(panel => {
            for (const gene in panel) {
                html += `<li><strong>${gene}:</strong> ${panel[gene]}</li>`;
            }
        });
    } else if (typeof geneticData === 'object') { 
         for (const gene in geneticData) {
            html += `<li><strong>${gene.replace(/_/g, ' ')}:</strong> ${geneticData[gene]}</li>`;
        }
    } else {
        return ''; 
    }
    html += '</ul>';
    return html;
}

function getOtherProceduresHtml(proceduresArray) {
    if (!proceduresArray || proceduresArray.length === 0) return '';
    let html = '<h4>기타 주요 시술/수술 기록</h4><ul>';
    const sortedProcedures = [...proceduresArray].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedProcedures.forEach(proc => {
        html += `<li><strong>${proc.date ? `(${proc.date}) ` : ''}${proc.procedureName || 'N/A'}:</strong> ${proc.details || ''}</li>`;
    });
    html += '</ul>';
    return html;
}

function getVitalSignsRecordsHtml(vitalSignsArray) { 
    if (!vitalSignsArray || vitalSignsArray.length === 0) return '';
    let html = '<h4>시간대별 활력징후 전체 기록</h4><table><thead><tr><th>날짜</th><th>시간</th><th>체중</th><th>혈압(BP)</th><th>맥박(HR)</th><th>호흡(RR)</th><th>체온(BT)</th><th>SpO2</th><th>산소장치</th></tr></thead><tbody>';
    const sortedVitals = [...vitalSignsArray].sort((a,b) => {
        const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
        const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
        return dateB - dateA;
    });
    sortedVitals.forEach(vital => {
        html += `<tr>
                    <td>${vital.date || 'N/A'}</td>
                    <td>${vital.time || 'N/A'}</td>
                    <td>${vital.weight || 'N/A'}</td>
                    <td>${vital.bp || 'N/A'}</td>
                    <td>${vital.hr || 'N/A'}</td>
                    <td>${vital.rr || 'N/A'}</td>
                    <td>${vital.bt || 'N/A'}</td>
                    <td>${vital.spO2 || 'N/A'}</td>
                    <td>${vital.o2Device || 'N/A'}</td>
                 </tr>`;
    });
    html += '</tbody></table>';
    return html;
}

function getConsultationsHtml(consultationsArray) { 
    if (!consultationsArray || consultationsArray.length === 0) return '';
    let html = '<h4>협진 기록</h4><ul>';
    consultationsArray.forEach(consult => {
        html += `<li><strong>${consult.date ? `(${consult.date}) ` : ''}${consult.department || '부서 미상'}:</strong> ${consult.reason || ''} <br><em>추천사항: ${consult.recommendation || ''}</em></li>`;
    });
    html += '</ul>';
    return html;
}

function getOsceObjectivesHtml(objectivesArray) { 
    if (!objectivesArray || objectivesArray.length === 0) return '';
    let html = '<h4>OSCE 학생 학습 목표</h4><ol>';
    objectivesArray.forEach(obj => {
        html += `<li>${obj}</li>`;
    });
    html += '</ol>';
    return html;
}

function displayPatientNotFound() {
    setInitialUIState(false); 
    const initialMsg = document.getElementById('initialMessage');
    if(initialMsg) initialMsg.classList.remove('active');
    
    const notFoundMsg = document.getElementById('patientNotFoundMessage');
    if(notFoundMsg) notFoundMsg.classList.add('active');
}

function showSection(sectionId, element) {
    if (patientMenu && patientMenu.classList.contains('disabled-menu') && 
        sectionId !== 'initialMessage' && 
        sectionId !== 'patientNotFoundMessage') {
        return; 
    }

    contentSectionIds.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.classList.remove('active');
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    if (patientMenu) {
        const navItems = patientMenu.querySelectorAll('li');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        if (element && !patientMenu.classList.contains('disabled-menu')) {
            element.classList.add('active');
        }
    }
}
