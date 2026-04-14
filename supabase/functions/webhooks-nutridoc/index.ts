/**
 * Edge Function Supabase pour recevoir les webhooks NutriDoc
 * URL: https://phgjpwaptrrjonoimmne.supabase.co/functions/v1/webhooks-nutridoc
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('NUTRIDOC_WEBHOOK_SECRET') || 'votre_cle_secrete'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const signature = req.headers.get('x-webhook-signature')
  
  if (!signature || signature !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
  }

  try {
    const { event, data, timestamp } = await req.json()

    console.log(`[NutriDoc] Webhook reçu: ${event}`)

    switch (event) {
      case 'plan.completed':
        await handlePlanCompleted(data)
        break
      
      case 'plan.pending':
        await handlePlanPending(data)
        break
      
      case 'patient.created':
        await handlePatientCreated(data)
        break
      
      case 'credits.low':
        await handleCreditsLow(data)
        break
      
      case 'visio.scheduled':
        await handleVisioScheduled(data)
        break
      
      case 'dietitian.verified':
        await handleDietitianVerified(data)
        break
      
      default:
        console.log(`[NutriDoc] Événement non traité: ${event}`)
    }

    // Journaliser
    await supabase.from('webhook_logs').insert({
      provider: 'nutridoc',
      event_type: event,
      payload: JSON.stringify(data).substring(0, 1000),
      status: 'success',
      created_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('[NutriDoc] Erreur:', error)
    
    await supabase.from('webhook_logs').insert({
      provider: 'nutridoc',
      event_type: 'error',
      payload: error.message,
      status: 'error',
      created_at: new Date().toISOString()
    })
    
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

// ==================== GESTIONNAIRES ====================

async function handlePlanCompleted(data: any) {
  const { plan_id, patient_id, patient_email, pdf_url, dieteticien } = data
  
  console.log(`📄 Plan ${plan_id} validé par ${dieteticien.nom}`)
  
  // 1. Mettre à jour le statut du plan
  await supabase
    .from('plans')
    .update({ 
      statut: 'valide',
      pdf_url: pdf_url,
      dieteticien_nom: dieteticien.nom,
      dieteticien_rpps: dieteticien.rpps,
      valide_at: new Date().toISOString()
    })
    .eq('id', plan_id)
  
  // 2. Envoyer un email au patient
  if (patient_email) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({
        type: 'plan_livre',
        to: patient_email,
        data: { plan_id, pdf_url, dieteticien_nom: dieteticien.nom }
      })
    })
  }
  
  // 3. Créer une notification
  await supabase.from('notifications').insert({
    user_id: patient_id,
    type: 'plan_valide',
    title: 'Votre plan alimentaire est prêt !',
    content: `Le plan validé par ${dieteticien.nom} est disponible.`,
    lien: `/dashboard.html?plan=${plan_id}`,
    created_at: new Date().toISOString()
  })
}

async function handlePlanPending(data: any) {
  const { plan_id, patient_prenom, objectif, prescripteur_id } = data
  
  console.log(`⏳ Nouvelle commande: ${plan_id} - ${patient_prenom}`)
  
  // Notifier le prescripteur
  await supabase.from('notifications').insert({
    user_id: prescripteur_id,
    type: 'commande_plan',
    title: 'Nouvelle commande de plan',
    content: `${patient_prenom} a commandé un plan (objectif: ${objectif})`,
    lien: `/prescripteur-dashboard.html`,
    created_at: new Date().toISOString()
  })
}

async function handlePatientCreated(data: any) {
  const { patient_id, prenom, nom, email, ville, objectif } = data
  
  console.log(`👤 Nouveau patient: ${prenom} ${nom}`)
  
  // Ajouter au CRM (table clients_prescripteur)
  await supabase.from('clients_prescripteur').insert({
    id: patient_id,
    prenom,
    nom,
    email,
    ville,
    objectif,
    source: 'nutridoc',
    created_at: new Date().toISOString()
  })
}

async function handleCreditsLow(data: any) {
  const { prescripteur_id, prescripteur_email, credits_restants } = data
  
  console.log(`⚠️ Crédits bas pour prescripteur ${prescripteur_id}: ${credits_restants}`)
  
  // Créer une notification
  await supabase.from('notifications').insert({
    user_id: prescripteur_id,
    type: 'credits_bas',
    title: '⚠️ Vos crédits sont bientôt épuisés',
    content: `Il vous reste ${credits_restants} crédits. Pensez à recharger.`,
    lien: `/gestion-credits-prescripteur.html`,
    created_at: new Date().toISOString()
  })
  
  // Envoyer un email
  if (prescripteur_email) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({
        type: 'credits_bas',
        to: prescripteur_email,
        data: { credits_restants }
      })
    })
  }
}

async function handleVisioScheduled(data: any) {
  const { visio_id, patient_email, dieteticien_email, date, heure, lien_visio } = data
  
  // Créer un événement dans la table visios
  await supabase.from('visios').insert({
    id: visio_id,
    patient_email,
    dieteticien_email,
    date,
    heure,
    lien_visio,
    statut: 'programmee',
    created_at: new Date().toISOString()
  })
}

async function handleDietitianVerified(data: any) {
  const { dietitian_id, email, prenom, nom, rpps } = data
  
  console.log(`✅ Diététicien vérifié: ${prenom} ${nom} (RPPS: ${rpps})`)
  
  // Mettre à jour le statut
  await supabase
    .from('profiles')
    .update({ 
      rpps_verifie: true,
      statut: 'actif',
      rpps_verifie_at: new Date().toISOString()
    })
    .eq('id', dietitian_id)
  
  // Envoyer un email de bienvenue
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
    body: JSON.stringify({
      type: 'bienvenue_dieteticien',
      to: email,
      data: { prenom, nom }
    })
  })
}