/**
 * Edge Function Supabase pour recevoir les webhooks Stripe
 * URL: https://phgjpwaptrrjonoimmne.supabase.co/functions/v1/webhooks-stripe
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ À remplacer par votre clé secrète Stripe webhook
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || 'whsec_votre_cle_ici'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), { status: 400 })
  }

  try {
    const body = await req.text()
    const event = JSON.parse(body)
    const eventType = event.type

    console.log(`[Stripe] Webhook reçu: ${eventType}`)

    switch (eventType) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object)
        break
      
      default:
        console.log(`[Stripe] Événement non traité: ${eventType}`)
    }

    // Journaliser le webhook
    await supabase.from('webhook_logs').insert({
      provider: 'stripe',
      event_type: eventType,
      payload: body.substring(0, 1000),
      status: 'success',
      created_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('[Stripe] Erreur:', error)
    
    await supabase.from('webhook_logs').insert({
      provider: 'stripe',
      event_type: 'error',
      payload: error.message,
      status: 'error',
      created_at: new Date().toISOString()
    })
    
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

// ==================== GESTIONNAIRES ====================

async function handlePaymentSuccess(paymentIntent: any) {
  const { id, amount, currency, metadata } = paymentIntent
  
  console.log(`✅ Paiement ${id}: ${amount/100} ${currency}`)
  
  // 1. Mettre à jour le statut de la commande
  if (metadata.plan_id) {
    await supabase
      .from('plans')
      .update({ statut: 'paye', paiement_date: new Date().toISOString() })
      .eq('id', metadata.plan_id)
  }
  
  // 2. Envoyer un email via l'Edge Function send-email
  if (metadata.patient_email) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({
        type: 'confirmation_paiement',
        to: metadata.patient_email,
        data: { montant: amount/100, plan_id: metadata.plan_id }
      })
    })
  }
  
  // 3. Mettre à jour le solde de crédits si nécessaire
  if (metadata.prescripteur_id) {
    await supabase.rpc('ajouter_credits', {
      p_prescripteur_id: metadata.prescripteur_id,
      p_credits: parseInt(metadata.nb_credits) || 0
    })
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  const { id, last_payment_error, metadata } = paymentIntent
  
  console.log(`❌ Paiement échoué ${id}: ${last_payment_error?.message}`)
  
  // Notifier le patient par email
  if (metadata.patient_email) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({
        type: 'paiement_echoue',
        to: metadata.patient_email,
        data: { erreur: last_payment_error?.message, plan_id: metadata.plan_id }
      })
    })
  }
}

async function handleSubscriptionCreated(subscription: any) {
  const { id, customer, items, status } = subscription
  const plan = items.data[0]?.plan
  
  console.log(`📋 Abonnement créé: ${id} - ${plan?.nickname}`)
  
  // Activer le compte diététicien
  await supabase
    .from('profiles')
    .update({ 
      statut_abo: plan?.nickname?.toLowerCase() || 'pro',
      abo_actif: true,
      abo_date_debut: new Date().toISOString()
    })
    .eq('stripe_customer_id', customer)
}

async function handleSubscriptionUpdated(subscription: any) {
  const { id, customer, items, status, cancel_at_period_end } = subscription
  const plan = items.data[0]?.plan
  
  await supabase
    .from('profiles')
    .update({ 
      statut_abo: plan?.nickname?.toLowerCase() || 'pro',
      abo_cancel_at_period_end: cancel_at_period_end
    })
    .eq('stripe_customer_id', customer)
}

async function handleSubscriptionDeleted(subscription: any) {
  const { customer } = subscription
  
  await supabase
    .from('profiles')
    .update({ 
      abo_actif: false,
      statut_abo: 'essentiel'
    })
    .eq('stripe_customer_id', customer)
}

async function handleInvoicePaid(invoice: any) {
  const { id, customer, amount_paid, currency, lines } = invoice
  
  console.log(`💰 Facture ${id} payée: ${amount_paid/100} ${currency}`)
  
  // Sauvegarder la facture
  await supabase.from('factures').insert({
    stripe_invoice_id: id,
    customer_id: customer,
    montant: amount_paid / 100,
    devise: currency,
    url: invoice.invoice_pdf,
    created_at: new Date().toISOString()
  })
}