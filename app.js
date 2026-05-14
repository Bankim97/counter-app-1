async function downloadCSV() {

  const { data, error } = await db
    .from("counter_logs")
    .select("log_date, hour_label, action, amount, before_value")
    .order("log_date", { ascending: true })
    .order("hour_label", { ascending: true });

  if (error) {
    alert("엑셀 다운로드 실패");
    console.error(error);
    return;
  }

  const grouped = {};

  data.forEach((row) => {

    const key =
      `${row.log_date}|${row.hour_label}`;

    if (!grouped[key]) {

      grouped[key] = {
        date: row.log_date,
        hour: row.hour_label,

        person1: 0,
        person2: 0,
        person3: 0,
        person4: 0,
        person5: 0,

        minus1: 0,
        minus2: 0,
        minus3: 0,
        minus4: 0,
        minus5: 0,

        resetCount: 0,
        resetBeforeTotal: 0
      };
    }

    /* 실제 증가량 */

    if (row.action === "인원1")
      grouped[key].person1 += 1;

    if (row.action === "인원2")
      grouped[key].person2 += 2;

    if (row.action === "인원3")
      grouped[key].person3 += 3;

    if (row.action === "인원4")
      grouped[key].person4 += 4;

    if (row.action === "인원5")
      grouped[key].person5 += 5;

    /* 실제 차감량 */

    if (row.action === "차감1")
      grouped[key].minus1 += 1;

    if (row.action === "차감2")
      grouped[key].minus2 += 2;

    if (row.action === "차감3")
      grouped[key].minus3 += 3;

    if (row.action === "차감4")
      grouped[key].minus4 += 4;

    if (row.action === "차감5")
      grouped[key].minus5 += 5;

    /* 리셋 */

    if (row.action === "리셋") {

      grouped[key].resetCount += 1;

      grouped[key].resetBeforeTotal +=
        Number(row.before_value || 0);
    }

  });

  const header = [
    "날짜",
    "시간대",
    "인원1",
    "인원2",
    "인원3",
    "인원4",
    "인원5",
    "차감1",
    "차감2",
    "차감3",
    "차감4",
    "차감5",
    "리셋횟수",
    "리셋전카운트"
  ];

  const rows =
    Object.values(grouped).map(row => [

      row.date,
      row.hour,

      row.person1,
      row.person2,
      row.person3,
      row.person4,
      row.person5,

      row.minus1,
      row.minus2,
      row.minus3,
      row.minus4,
      row.minus5,

      row.resetCount,
      row.resetBeforeTotal
    ]);

  const csv = [header, ...rows]
    .map(row =>
      row
        .map(value =>
          `"${String(value ?? "")
            .replaceAll('"','""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob =
    new Blob(
      ["\uFEFF"+csv],
      {
        type:"text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href=url;

  a.download=
  `카운터_집계_${
    new Date()
    .toISOString()
    .slice(0,10)
  }.csv`;

  a.click();

  URL.revokeObjectURL(url);

}