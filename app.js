const SUPABASE_URL = "https://pvhhcydrydjaxtpquvjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_tWUYMtiFo6OzDhgNFaCy3Q_rr0o08Rn";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const countEl = document.getElementById("count");

/* 숫자 표시 */
function updateCountDisplay(value) {
  countEl.textContent = value;

  if (value >= 50) {
    countEl.classList.add("danger");
  } else {
    countEl.classList.remove("danger");
  }
}

/* 최초 카운트 불러오기 */
async function loadCount() {
  const { data, error } = await db
    .from("counters")
    .select("value")
    .eq("id", 1)
    .single();

  if (error) {
    alert("카운트 불러오기 실패");
    console.error(error);
    return;
  }

  updateCountDisplay(data.value);
}

/* 카운트 변경 */
async function changeCount(amount, action) {
  const { data, error } = await db.rpc("change_counter", {
    p_amount: amount,
    p_action: action
  });

  if (error) {
    alert("카운트 변경 실패");
    console.error(error);
    return;
  }

  updateCountDisplay(data);
}

/* 리셋 */
async function resetCount() {
  const ok = confirm("정말 리셋하시겠습니까?");
  if (!ok) return;

  const { data, error } = await db.rpc("reset_counter");

  if (error) {
    alert("리셋 실패");
    console.error(error);
    return;
  }

  updateCountDisplay(data);
}

/* 실시간 동기화 */
db.channel("counter-realtime")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "counters"
    },
    (payload) => {
      updateCountDisplay(payload.new.value);
    }
  )
  .subscribe();

/* 엑셀 다운로드 */
async function downloadCSV() {
  const { data, error } = await db
    .from("counter_logs")
    .select("log_date, hour_label, action")
    .order("log_date", { ascending: true })
    .order("hour_label", { ascending: true });

  if (error) {
    alert("엑셀 다운로드 실패");
    console.error(error);
    return;
  }

  const grouped = {};

  data.forEach((row) => {
    const key = `${row.log_date}|${row.hour_label}`;

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
        minus5: 0
      };
    }

    if (row.action === "인원1") grouped[key].person1 += 1;
    if (row.action === "인원2") grouped[key].person2 += 1;
    if (row.action === "인원3") grouped[key].person3 += 1;
    if (row.action === "인원4") grouped[key].person4 += 1;
    if (row.action === "인원5") grouped[key].person5 += 1;

    if (row.action === "차감1") grouped[key].minus1 += 1;
    if (row.action === "차감2") grouped[key].minus2 += 1;
    if (row.action === "차감3") grouped[key].minus3 += 1;
    if (row.action === "차감4") grouped[key].minus4 += 1;
    if (row.action === "차감5") grouped[key].minus5 += 1;
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
    "차감5"
  ];

  const rows = Object.values(grouped).map((row) => [
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
    row.minus5
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `카운터_클릭수_집계_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

/* 시작 */
loadCount();