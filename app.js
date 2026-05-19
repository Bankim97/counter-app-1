const SUPABASE_URL =
  "https://pvhhcydrydjaxtpquvjj.supabase.co";

const SUPABASE_ANON_KEY =
  "여기에_app1_키";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let userName = localStorage.getItem("counterApp1UserName");

if (!userName) {
  userName = prompt("사용자 이름을 입력하세요") || "unknown";

  localStorage.setItem(
    "counterApp1UserName",
    userName
  );
}

const countEl =
  document.getElementById("count");

function getTodayKorea() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(new Date());
}

function getDateKorea(dateValue) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(new Date(dateValue));
}

function updateCountDisplay(value) {
  countEl.textContent = value;

  if (value >= 50) {
    countEl.classList.add("danger");
  } else {
    countEl.classList.remove("danger");
  }
}

async function autoResetIfNewDay() {
  const { data, error } =
    await db
      .from("counters")
      .select("value,updated_at")
      .eq("id", 1)
      .single();

  if (error) {
    console.error(error);
    return;
  }

  const today = getTodayKorea();

  const lastDate =
    getDateKorea(data.updated_at);

  if (
    today !== lastDate &&
    data.value !== 0
  ) {
    const result =
      await db.rpc("reset_counter", {
        p_user_name: userName
      });

    if (result.error) {
      console.error(result.error);
      return;
    }

    updateCountDisplay(result.data);

    return;
  }

  updateCountDisplay(data.value);
}

async function loadCount() {
  await autoResetIfNewDay();
}

async function changeCount(
  amount,
  action
) {
  await autoResetIfNewDay();

  const { data, error } =
    await db.rpc("change_counter", {
      p_amount: amount,
      p_action: action,
      p_user_name: userName
    });

  if (error) {
    alert("카운트 변경 실패");
    console.error(error);
    return;
  }

  updateCountDisplay(data);
}

async function resetCount() {
  const password = prompt(
    "리셋 비밀번호 4자리를 입력하세요."
  );

  if (password === null) return;

  if (password !== "1210") {
    alert("비밀번호가 틀렸습니다.");
    return;
  }

  const ok = confirm(
    "정말 리셋하시겠습니까?"
  );

  if (!ok) return;

  const { data, error } =
    await db.rpc("reset_counter", {
      p_user_name: userName
    });

  if (error) {
    alert("리셋 실패");
    console.error(error);
    return;
  }

  updateCountDisplay(data);
}

db.channel("counter-app1-realtime")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "counters"
    },
    (payload) => {
      updateCountDisplay(
        payload.new.value
      );
    }
  )
  .subscribe();

async function downloadCSV() {
  const { data, error } =
    await db
      .from("counter_logs")
      .select(
        "log_date,hour_label,user_name,action,amount,before_value"
      )
      .order("log_date", {
        ascending: true
      })
      .order("hour_label", {
        ascending: true
      });

  if (error) {
    alert("엑셀 다운로드 실패");
    console.error(error);
    return;
  }

  const grouped = {};

  data.forEach((row) => {
    const key =
      `${row.log_date}|${row.hour_label}|${row.user_name}`;

    if (!grouped[key]) {
      grouped[key] = {
        date: row.log_date,
        hour: row.hour_label,
        user: row.user_name,

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

    if (row.action === "리셋") {
      grouped[key].resetCount += 1;

      grouped[key].resetBeforeTotal +=
        Number(
          row.before_value || 0
        );
    }
  });

  const header = [
    "날짜",
    "시간대",
    "사용자",
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

  const rows = Object.values(
    grouped
  ).map((row) => [
    row.date,
    row.hour,
    row.user,
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
    .map((row) =>
      row
        .map(
          (value) =>
            `"${String(
              value ?? ""
            ).replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type:
        "text/csv;charset=utf-8;"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `카운터1_사용자별_집계_${
      new Date()
        .toISOString()
        .slice(0, 10)
    }.csv`;

  a.click();

  URL.revokeObjectURL(url);
}

loadCount();

setInterval(() => {
  autoResetIfNewDay();
}, 60000);