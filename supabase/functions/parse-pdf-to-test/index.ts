import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

interface ParsedChoice {
  choice_text: string
  is_correct: boolean
}

interface ParsedQuestion {
  question_text: string
  choices: ParsedChoice[]
  explanation?: string
}

class HttpError extends Error {
  status: number
  stage: string
  debug?: unknown
  constructor(status: number, message: string, stage = "unknown", debug?: unknown) {
    super(message)
    this.status = status
    this.stage = stage
    this.debug = debug
  }
}

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_QUESTIONS = 500
const AI_TIMEOUT_MS = 170000
const PRIMARY_MODEL = "google/gemini-2.5-flash"
const FALLBACK_MODEL = "google/gemini-2.5-flash-lite"

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const log = (stage: string, msg: string, extra?: unknown) => {
  const line = `[parse-pdf-to-test][${stage}] ${msg}`
  if (extra !== undefined) console.log(line, extra)
  else console.log(line)
}

function encodeBase64Chunked(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function parseAnswerKeys(input: string | null): Map<number, string> {
  const map = new Map<number, string>()
  if (!input?.trim()) return map
  const normalized = input.replace(/[，؛]/g, ",")
  const regex = /(\d{1,3})\s*[\)\].:\-]?\s*([A-Da-d]|[1-4])/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(normalized)) !== null) {
    const questionNumber = Number(match[1])
    const key = match[2].toUpperCase()
    if (questionNumber > 0) {
      map.set(questionNumber, key)
    }
  }
  return map
}

function getForcedCorrectIndex(key: string, choicesCount: number): number | null {
  if (/^[1-4]$/.test(key)) {
    const index = Number(key) - 1
    return index < choicesCount ? index : null
  }
  if (/^[A-D]$/.test(key)) {
    const index = key.charCodeAt(0) - 65
    return index < choicesCount ? index : null
  }
  return null
}

function normalizeQuestions(rawQuestions: ParsedQuestion[], answerKeyMap: Map<number, string>): ParsedQuestion[] {
  const normalized: ParsedQuestion[] = []
  for (let i = 0; i < rawQuestions.length; i++) {
    const raw = rawQuestions[i]
    const questionText = typeof raw?.question_text === "string" ? raw.question_text.trim() : ""
    if (questionText.length < 3) continue

    let choices = Array.isArray(raw?.choices)
      ? raw.choices
          .map((choice) => ({
            choice_text: typeof choice?.choice_text === "string" ? choice.choice_text.trim() : "",
            is_correct: Boolean(choice?.is_correct),
          }))
          .filter((choice) => choice.choice_text.length > 0)
      : []

    if (choices.length < 2) continue
    if (choices.length > 4) choices = choices.slice(0, 4)

    const forcedKey = answerKeyMap.get(i + 1)
    const forcedIndex = forcedKey ? getForcedCorrectIndex(forcedKey, choices.length) : null
    const aiCorrectIndex = choices.findIndex((choice) => choice.is_correct)
    const finalCorrectIndex = forcedIndex ?? (aiCorrectIndex >= 0 ? aiCorrectIndex : 0)

    const normalizedChoices = choices.map((choice, idx) => ({
      choice_text: choice.choice_text,
      is_correct: idx === finalCorrectIndex,
    }))

    normalized.push({
      question_text: questionText,
      choices: normalizedChoices,
      explanation: typeof raw?.explanation === "string" ? raw.explanation.trim().slice(0, 500) : undefined,
    })

    if (normalized.length >= MAX_QUESTIONS) break
  }
  return normalized
}

function extractQuestionsFromToolCall(aiData: any): ParsedQuestion[] {
  const toolCalls = aiData?.choices?.[0]?.message?.tool_calls
  if (!Array.isArray(toolCalls)) return []
  for (const call of toolCalls) {
    const args = call?.function?.arguments
    if (typeof args !== "string") continue
    try {
      const parsed = JSON.parse(args)
      if (Array.isArray(parsed?.questions)) return parsed.questions
    } catch { continue }
  }
  return []
}

function extractQuestionsFromTextContent(content: unknown): ParsedQuestion[] {
  if (!content) return []
  let text = ""
  if (typeof content === "string") {
    text = content.trim()
  } else if (Array.isArray(content)) {
    text = content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n").trim()
  }
  if (!text) return []
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []
  let jsonStr = jsonMatch[0]
  try {
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed?.questions) ? parsed.questions : []
  } catch {
    const lastCompleteQuestion = jsonStr.lastIndexOf("},")
    if (lastCompleteQuestion <= 0) return []
    try {
      jsonStr = jsonStr.substring(0, lastCompleteQuestion + 1) + "]}"
      const recovered = JSON.parse(jsonStr)
      return Array.isArray(recovered?.questions) ? recovered.questions : []
    } catch { return [] }
  }
}

async function extractAnswerKeysFromImage(
  base64Image: string,
  mimeType: string,
  lovableApiKey: string
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Rasmdagi javoblar kalitini (answer key) aniq o'qi va quyidagi formatda qaytar:
1-A
2-B
3-C
...
Faqat raqam va harf formatida yoz, boshqa hech narsa qo'shma. Har bir javob alohida qatorda bo'lsin.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Rasmdagi javoblar kalitini o'qib, formatlab ber." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      console.error("Answer key image AI error:", response.status)
      return ""
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content || ""
    return typeof text === "string" ? text.trim() : ""
  } catch (e) {
    console.error("Answer key image extraction error:", e)
    return ""
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callAiGateway(params: {
  model: string
  lovableApiKey: string
  base64Pdf: string
  answerKeys: string | null
}): Promise<ParsedQuestion[]> {
  const answerKeyInstruction = params.answerKeys?.trim()
    ? `\n\nMUHIM: Quyidagi javoblar kaliti berilgan. Shu bo'yicha to'g'ri javoblarni belgilang:\n${params.answerKeys}`
    : ""

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${params.lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: "system",
            content: `Sen PDF fayllardan test savollarini TO'LIQ va ANIQ ajratib oluvchi AI san.

MUHIM QOIDALAR:
1. PDF dagi BARCHA savollarni birma-bir to'liq nusxalab ol - HECH BIRINI tashlab ketma
2. Har bir savolning MATNINI TO'LIQ yoz - matematika formulalari, sonlar, tenglama, ifoda, misol - hammasini aniq ko'chir
3. Agar savolda raqamlar, tenglamalar, formulalar bo'lsa - ularni AYNAN PDF dagi ko'rinishda yoz
   - Masalan: "2x² + 3x - 5 = 0 tenglamaning ildizlari yig'indisini toping"
   - Masalan: "√(16) + 3² = ?" 
   - Masalan: "log₂(8) qiymatini toping"
4. Har bir savolda 2-4 ta javob varianti bo'lsin, faqat 1 ta TO'G'RI javob
5. Javob variantlarini ham TO'LIQ va ANIQ yoz - formulalar, sonlar bilan
6. Savollar va javoblar asl tilda saqlansin (o'zbek, rus, ingliz - qaysi tilda bo'lsa)
7. Explanation (tushuntirish) qisqa - 1-2 jumla
8. Keraksiz sarlavha, izoh, sahifa raqamlari va boshqa shovqinni olib tashla
9. Agar savol rasmi/chizmasi bo'lsa - uni matn shaklida tasvirlab yoz (masalan: "Chizmada ABC uchburchak berilgan, AB=5, BC=3")${answerKeyInstruction}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "PDF dagi BARCHA test savollarini birma-bir TO'LIQ nusxalab ol. Hech bir savolni tashlab ketma. Formulalar, sonlar, tenglamalar - hammasini AYNAN ko'chir. Tool orqali questions massivida qaytar.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${params.base64Pdf}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_questions",
              description: "PDF dan test savollarini structured ko'rinishda qaytaradi",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "Savolning TO'LIQ matni - formulalar, sonlar, tenglamalar bilan" },
                        explanation: { type: "string", description: "Qisqa tushuntirish - 1-2 jumla" },
                        choices: {
                          type: "array",
                          minItems: 2,
                          maxItems: 4,
                          items: {
                            type: "object",
                            properties: {
                              choice_text: { type: "string", description: "Javob varianti - formulalar/sonlar bilan to'liq" },
                              is_correct: { type: "boolean" },
                            },
                            required: ["choice_text", "is_correct"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["question_text", "choices"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_questions" } },
        temperature: 0.1,
        max_tokens: 32000,
      }),
    })

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) throw new HttpError(429, "Juda ko'p so'rov. 1 daqiqadan keyin qayta urinib ko'ring.")
      if (aiResponse.status === 402) throw new HttpError(402, "AI krediti tugadi.")
      if (aiResponse.status === 413) throw new HttpError(413, "PDF juda katta.")
      const errorText = await aiResponse.text()
      console.error("AI error:", aiResponse.status, errorText)
      throw new HttpError(500, `AI xatolik: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const toolQuestions = extractQuestionsFromToolCall(aiData)
    if (toolQuestions.length > 0) return toolQuestions

    const fallbackQuestions = extractQuestionsFromTextContent(aiData?.choices?.[0]?.message?.content)
    return fallbackQuestions
  } catch (error: unknown) {
    if ((error as Error)?.name === "AbortError") {
      throw new HttpError(504, "AI javobi juda sekin. Kichikroq PDF bilan urinib ko'ring.")
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const subject = formData.get("subject") as string
    const title = formData.get("title") as string
    const duration_minutes = parseInt((formData.get("duration_minutes") as string) || "30")
    const access_code = formData.get("access_code") as string | null
    let answer_keys = formData.get("answer_keys") as string | null
    const answer_key_image = formData.get("answer_key_image") as File | null

    if (!file || !subject || !title) {
      return jsonResponse({ error: "file, subject va title majburiy" }, 400)
    }

    if (title.length < 3 || title.length > 200) {
      return jsonResponse({ error: "Test nomi 3-200 belgi orasida bo'lishi kerak" }, 400)
    }

    if (isNaN(duration_minutes) || duration_minutes < 5 || duration_minutes > 240) {
      return jsonResponse({ error: "Davomiyligi 5-240 daqiqa orasida bo'lishi kerak" }, 400)
    }

    if (access_code && (access_code.length < 4 || access_code.length > 20)) {
      return jsonResponse({ error: "Kirish kodi 4-20 belgi orasida bo'lishi kerak" }, 400)
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return jsonResponse({ error: "Faqat PDF fayl yuklash mumkin" }, 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse({ error: `Fayl juda katta. Maksimal hajm: ${MAX_FILE_SIZE / 1024 / 1024}MB` }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    if (uint8Array.length < 4 || uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
      return jsonResponse({ error: "Fayl haqiqiy PDF formatida emas" }, 400)
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY topilmadi")

    const base64Content = encodeBase64Chunked(uint8Array)

    // If answer key image is uploaded, extract text from it using AI
    if (answer_key_image && answer_key_image.size > 0) {
      const imageBuffer = await answer_key_image.arrayBuffer()
      const imageBytes = new Uint8Array(imageBuffer)
      const imageBase64 = encodeBase64Chunked(imageBytes)
      const imageMime = answer_key_image.type || "image/png"
      
      console.log("Extracting answer keys from image...")
      const extractedKeys = await extractAnswerKeysFromImage(imageBase64, imageMime, lovableApiKey)
      
      if (extractedKeys) {
        console.log("Extracted answer keys from image:", extractedKeys.substring(0, 200))
        answer_keys = answer_keys?.trim() 
          ? `${answer_keys}\n${extractedKeys}` 
          : extractedKeys
      }
    }

    const answerKeyMap = parseAnswerKeys(answer_keys)

    // Auth: use getUser instead of getClaims
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error("Server sozlamalari to'liq emas")

    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Avtorizatsiya kerak" }, 401)

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await authClient.auth.getUser()
    const userId = userData?.user?.id

    if (userError || !userId) return jsonResponse({ error: "Foydalanuvchi topilmadi" }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: isSuperAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    })

    if (roleError || !isSuperAdmin) return jsonResponse({ error: "Super Admin huquqi kerak" }, 403)

    let aiQuestions = await callAiGateway({
      model: PRIMARY_MODEL,
      lovableApiKey,
      base64Pdf: base64Content,
      answerKeys: answer_keys,
    })

    if (aiQuestions.length === 0) {
      console.log("Primary model returned 0 questions, trying fallback...")
      aiQuestions = await callAiGateway({
        model: FALLBACK_MODEL,
        lovableApiKey,
        base64Pdf: base64Content,
        answerKeys: answer_keys,
      })
    }

    const parsedQuestions = normalizeQuestions(aiQuestions, answerKeyMap)

    if (parsedQuestions.length === 0) {
      return jsonResponse({ error: "Savollar topilmadi. PDF formatini tekshiring." }, 400)
    }

    const { data: testData, error: testError } = await adminClient
      .from("tests")
      .insert({
        title: title.trim(),
        description: `PDF dan import - ${parsedQuestions.length} ta savol`,
        subject,
        duration_minutes,
        created_by: userId,
        is_published: false,
        access_code: access_code?.trim() || null,
      })
      .select("id")
      .single()

    if (testError || !testData) throw new Error(`Test yaratishda xatolik: ${testError?.message}`)

    const questionsPayload = parsedQuestions.map((q, i) => ({
      test_id: testData.id,
      question_text: q.question_text,
      order_index: i,
    }))

    const { data: insertedQuestions, error: questionsInsertError } = await adminClient
      .from("questions")
      .insert(questionsPayload)
      .select("id, order_index")

    if (questionsInsertError || !insertedQuestions?.length) {
      throw new Error(`Savollarni saqlashda xatolik: ${questionsInsertError?.message}`)
    }

    const questionIdByOrder = new Map<number, string>(
      insertedQuestions.map((q) => [q.order_index, q.id])
    )

    const choicesPayload = parsedQuestions.flatMap((q, qi) => {
      const questionId = questionIdByOrder.get(qi)
      if (!questionId) return []
      return q.choices.map((c, ci) => ({
        question_id: questionId,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        order_index: ci,
      }))
    })

    for (let i = 0; i < choicesPayload.length; i += 500) {
      const chunk = choicesPayload.slice(i, i + 500)
      const { error: choicesError } = await adminClient.from("choices").insert(chunk)
      if (choicesError) throw new Error(`Javob variantlarini saqlashda xatolik: ${choicesError.message}`)
    }

    return jsonResponse({
      success: true,
      test_id: testData.id,
      questions_count: insertedQuestions.length,
      message: `${insertedQuestions.length} ta savol muvaffaqiyatli import qilindi`,
    })
  } catch (error: unknown) {
    console.error("parse-pdf-to-test error:", error)
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status)
    const errorMessage = error instanceof Error ? error.message : "Xatolik yuz berdi"
    return jsonResponse({ error: errorMessage }, 500)
  }
})
