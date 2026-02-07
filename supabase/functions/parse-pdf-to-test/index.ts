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

    if (!file || !subject || !title) {
      return new Response(
        JSON.stringify({ error: "file, subject va title majburiy" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return new Response(
        JSON.stringify({ error: "Faqat PDF fayl yuklash mumkin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Read PDF content as base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY topilmadi")
    }

    // Use Lovable AI with vision to parse PDF
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
3. To'g'ri javobni aniq belgilang - odatda (*) yoki boshqa belgilar bilan ko'rsatilgan bo'ladi
4. Agar to'g'ri javob aniq bo'lmasa, birinchi variantni to'g'ri deb belgilang
5. Faqat toza JSON qaytar, boshqa hech narsa yo'q
6. Savollarni asl tilda saqlang
7. Har bir savol uchun explanation yozing - bu noto'g'ri javob bergan foydalanuvchilarga ko'rsatiladi`
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
          JSON.stringify({ error: "Juda ko'p so'rov yuborildi. Biroz kuting." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Lovable AI krediti tugadi." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      const errorText = await aiResponse.text()
      console.error("AI error:", aiResponse.status, errorText)
      throw new Error(`AI xatolik: ${errorText}`)
    }

    const aiData = await aiResponse.json()
    const aiContent = aiData.choices?.[0]?.message?.content || ""
    
    // Parse JSON from AI response
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
      throw new Error("AI javobini tahlil qilib bo'lmadi")
    }

    if (parsedQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Savollar topilmadi. PDF formatini tekshiring." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from authorization header
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

    // Check if user is super_admin (only super admin can upload PDF)
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

    // Create the test
    const { data: testData, error: testError } = await supabase
      .from("tests")
      .insert({
        title: title,
        description: `PDF dan import qilingan - ${parsedQuestions.length} ta savol`,
        subject: subject,
        duration_minutes: duration_minutes,
        created_by: user.id,
        is_published: false,
        access_code: access_code || null,
      })
      .select()
      .single()

    if (testError) {
      throw new Error(`Test yaratishda xatolik: ${testError.message}`)
    }

    // Insert questions and choices
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

      // Insert choices
      const choicesData = q.choices.map((c, idx) => ({
        question_id: questionData.id,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        order_index: idx,
      }))

      await supabase.from("choices").insert(choicesData)
    }

    return new Response(
      JSON.stringify({
        success: true,
        test_id: testData.id,
        questions_count: parsedQuestions.length,
        message: `${parsedQuestions.length} ta savol muvaffaqiyatli import qilindi`,
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
