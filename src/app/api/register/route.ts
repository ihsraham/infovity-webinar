// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { validateRegistration, webinarTopics, createRegistration } from '@/models/registration';

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    { status: 'ok', message: 'API is running' },
    { headers: corsHeaders }
  );
}

// Registration endpoint
export async function POST(request: NextRequest) {
  try {
    // Get the data from the request
    const data = await request.json();
    
    // Validate the data
    const validation = validateRegistration(data);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.errors },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('infovity');
    const registrations = db.collection('registrations');
    
    // Check if email already exists for this webinar
    const existingRegistration = await registrations.findOne({
      email: data.email,
      'webinarInfo.title': webinarTopics[data.topic]?.title
    });
    
    if (existingRegistration) {
      return NextResponse.json(
        { success: false, message: 'You are already registered for this webinar' },
        { status: 409, headers: corsHeaders }
      );
    }
    
    // Create registration object
    const registration = createRegistration(data);
    
    // Insert into database
    await registrations.insertOne(registration);
    
    // Return success
    return NextResponse.json(
      { success: true, message: 'Registration successful', webinarInfo: registration.webinarInfo },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during registration' },
      { status: 500, headers: corsHeaders }
    );
  }
}