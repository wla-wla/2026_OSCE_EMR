# PPC Pure EMR v4.1

정적 Pure EMR 차트 앱입니다. 루트의 v4.1 환자 JSON 4개를 `data/patients` 아래에 배치해 사용합니다.

로컬 파일을 직접 열면 브라우저 정책에 따라 JSON 조회가 제한될 수 있습니다. 이 경우 `OSCE-main` 폴더에서 간단한 정적 서버를 실행해 접속합니다.

```powershell
python -m http.server 8000
```

검색 예: `P001`, `P002`, `P003`, `P004`, `patient-a`, `patient-b`, `patient-c`, `patient-d`, 환자명.
