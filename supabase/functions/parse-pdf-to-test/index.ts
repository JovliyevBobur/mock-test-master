import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

interface ParsedQuestion {
  question_text: string
  choices: {
    choice_text: string
    is_correct: boolean
  }[]
  explanation?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const subject = formData.get("subject") as string
    const title = formData.get("title") as string
    const duration_minutes = parseInt(formData.get("duration_minutes") as string || "30")
    const access_code = formData.get("access_code") as string | null
    const answer_keys = formData.get("answer_keys") as string | null

    // === INPUT VALIDATION ===
    if (!file || !subject || !title) {
      return new Response(
        JSON.stringify({ error: "file, subject va title majburiy" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      return new Response(
        JSON.stringify({ error: "Test nomi 3-200 belgi orasida bo'lishi kerak" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate duration
    if (isNaN(duration_minutes) || duration_minutes < 5 || duration_minutes > 240) {
      return new Response(
        JSON.stringify({ error: "Davomiyligi 5-240 daqiqa orasida bo'lishi kerak" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate access code
    if (access_code && (access_code.length < 4 || access_code.length > 20)) {
      return new Response(
        JSON.stringify({ error: "Kirish kodi 4-20 belgi orasida bo'lishi kerak" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return new Response(
        JSON.stringify({ error: "Faqat PDF fayl yuklash mumkin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Fayl juda katta. Maksimal hajm: ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Validate PDF magic number (%PDF)
    if (uint8Array.length < 4 || uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
      return new Response(
        JSON.stringify({ error: "Fayl haqiqiy PDF formatida emas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Use standard base64 encoding (Deno built-in)
    const { encode: encodeBase64 } = await import("https://deno.land/std@0.208.0/encoding/base64.ts")
    const base64Content = encodeBase64(uint8Array)

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY topilmadi")
    }

    // Build prompt based on whether answer keys are provided
    let answerKeyInstruction = ""
    if (answer_keys && answer_keys.trim()) {
      answerKeyInstruction = `

MUHIM: Quyidagi javoblar kaliti berilgan. Shu bo'yicha to'g'ri javoblarni belgilang:
${answer_keys}

Javoblar kaliti formatlarini tushunib ol (masalan: "1-B", "1B", "1.B", "1) B" va h.k.).
Har bir savolning to'g'ri javobini shu kalitdan olgin.`
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sen test savollarini tahlil qiluvchi AI san. 
PDF fayldan test savollarini ajratib ol va quyidagi JSON formatda qaytar:
{
  "questions": [
    {
      "question_text": "Savol matni",
      "choices": [
        { "choice_text": "A variant", "is_correct": false },
        { "choice_text": "B variant", "is_correct": true },
        { "choice_text": "C variant", "is_correct": false },
        { "choice_text": "D variant", "is_correct": false }
      ],
      "explanation": "Nima uchun bu javob to'g'ri ekanligi haqida qisqacha tushuntirish"
    }
  ]
}

MUHIM QOIDALAR:
1. Har bir savolda kamida 2 ta, ko'pi bilan 4 ta javob varianti bo'lsin
2. Faqat BITTA to'g'ri javob bo'lsin (is_correct: true)
3. To'g'ri javobni aniq belgilang
4. Faqat toza JSON qaytar, boshqa hech narsa yo'q
5. Savollarni asl tilda saqlang
6. Har bir savol uchun explanation yozing
${answerKeyInstruction}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Quyidagi PDF fayldan test savollarini ajratib ber. Har bir savol uchun to'g'ri javobni aniq belgilab, tushuntirish ham yoz:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Content}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    })

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Juda ko'p so'rov yuborildi. Iltimos, 1 daqiqadan keyin qayta urinib ko'ring." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI krediti tugadi. Iltimos, administratorga murojaat qiling." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      const errorText = await aiResponse.text()
      console.error("AI error:", aiResponse.status, errorText)
      throw new Error(`AI xatolik: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const aiContent = aiData.choices?.[0]?.message?.content || ""
    
    let parsedQuestions: ParsedQuestion[] = []
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        parsedQuestions = parsed.questions || []
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError)
      console.error("AI content:", aiContent)
      throw new Error("AI javobini tahlil qilib bo'lmadi. PDF formatini tekshiring.")
    }

    if (parsedQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Savollar topilmadi. PDF formatini tekshiring." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Limit questions count
    if (parsedQuestions.length > 100) {
      parsedQuestions = parsedQuestions.slice(0, 100)
    }

    // === AUTH & DB ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Avtorizatsiya kerak" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Foydalanuvchi topilmadi" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!roleData || roleData.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Bu amal uchun Super Admin huquqi kerak" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: testData, error: testError } = await supabase
      .from("tests")
      .insert({
        title: title.trim(),
        description: `PDF dan import qilingan - ${parsedQuestions.length} ta savol`,
        subject: subject,
        duration_minutes: duration_minutes,
        created_by: user.id,
        is_published: false,
        access_code: access_code?.trim() || null,
      })
      .select()
      .single()

    if (testError) {
      throw new Error(`Test yaratishda xatolik: ${testError.message}`)
    }

    let successCount = 0
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i]
      
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .insert({
          test_id: testData.id,
          question_text: q.question_text,
          order_index: i,
        })
        .select()
        .single()

      if (questionError) {
        console.error("Question error:", questionError)
        continue
      }

      const choicesData = q.choices.map((c, idx) => ({
        question_id: questionData.id,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        order_index: idx,
      }))

      const { error: choiceError } = await supabase.from("choices").insert(choicesData)
      if (!choiceError) successCount++
    }

    return new Response(
      JSON.stringify({
        success: true,
        test_id: testData.id,
        questions_count: successCount,
        message: `${successCount} ta savol muvaffaqiyatli import qilindi`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    console.error("Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Xatolik yuz berdi"
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
