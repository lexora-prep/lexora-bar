export async function postStudyPlan(requestBody: unknown) {
  const res = await fetch("/api/study-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  const data = await res.json().catch(() => null)

  return {
    ok: res.ok && !data?.error,
    data,
    error: data?.error || null,
  }
}

export async function deleteStudyPlan(userId: string) {
  const res = await fetch(`/api/study-plan?userId=${userId}`, {
    method: "DELETE",
  })

  const data = await res.json().catch(() => null)

  return {
    ok: res.ok && !data?.error,
    data,
    error: data?.error || null,
  }
}
