'use client';
import * as React from 'react';

import { useState } from 'react'
  import  { GraphQLClient } from 'propeller-sdk-v2';
import  { UserService } from 'propeller-sdk-v2';



  export interface ForgotPasswordProps {
/** GraphQL client for the Propeller SDK */
graphqlClient: GraphQLClient;

/** Title of the forgot password form
 * @default "Forgot password?"
 */
title?: string;

/** Subtitle of the forgot password form
 * @default ""
 */
subtitle?: string;

/** Label for the submit button
 * @default "Reset"
 */
buttonText?: string;

/** Message displayed after successful submission
 * @default "If an account exists with this email, you will receive a password reset link shortly."
 */
responseMessage?: string;

/**
 * Labels for the forgot password form fields.
 *
 * Available keys:
 * - email: Email field label (default: "Email")
 * - emailPlaceholder: Email input placeholder (default: "name@example.com")
 */
labels?: Record<string, string>;

/** Callback before the forgot password process starts */
beforeForgotPassword?: () => void;

/** Callback after the user has requested a password reset */
afterForgotPassword?: (result: boolean) => void;
}




  function ForgotPassword(props:ForgotPasswordProps) {

  const [_email, set_email] = useState(() => (''))


const [_loading, set_loading] = useState(() => (false))


const [_submitted, set_submitted] = useState(() => (false))


const [_error, set_error] = useState(() => (''))


function resolvedTitle() {
return props.title !== undefined ? props.title : 'Forgot password?';
}


function resolvedButtonText() {
return props.buttonText || 'Reset';
}


function resolvedResponseMessage() {
return props.responseMessage || 'If an account exists with this email, you will receive a password reset link shortly.';
}


function emailLabel() {
return props.labels?.email || 'Email';
}


function emailPlaceholder() {
return props.labels?.emailPlaceholder || 'name@example.com';
}


async function handleSubmit(e: Event) {
e.preventDefault();
if (_loading) return;
if (props.beforeForgotPassword) {
props.beforeForgotPassword();
}
set_loading(true);
set_error('');
try {
const userService = new UserService(props.graphqlClient as GraphQLClient);
const result = await userService.sendPasswordResetEmail({
  email: _email
});
set_submitted(true);
if (props.afterForgotPassword) {
  props.afterForgotPassword(result);
}
} catch (err: any) {
set_error(err?.message || 'Something went wrong. Please try again.');
if (props.afterForgotPassword) {
  props.afterForgotPassword(false);
}
} finally {
set_loading(false);
}
}











return (


  <div className="forgot-password-form">{resolvedTitle() ? (
  <div className="space-y-1 text-center mb-6"><h2 className="text-2xl font-bold">{resolvedTitle()}</h2>{props.subtitle ? (
  <p className="text-sm text-gray-500">{props.subtitle}</p>
) : null}</div>
) : null}{!_submitted ? (
  <form className="space-y-4"  onSubmit={(e) => handleSubmit(e) }><div className="space-y-2"><label  htmlFor="forgot-password-email" className="text-sm font-medium leading-none">{emailLabel()}</label><input  type="email"  id="forgot-password-email"  name="email" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_email}  onChange={(e) => {
set_email((e.target as HTMLInputElement).value);
} }  placeholder={emailPlaceholder()}  required  disabled={_loading}  /></div>{_error ? (
  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{_error}</div>
) : null}<button  type="submit" className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"  disabled={_loading}>{_loading ? (
  <svg  xmlns="http://www.w3.org/2000/svg"  fill="none"  viewBox="0 0 24 24" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"><circle  cx="12"  cy="12"  r="10"  stroke="currentColor"  stroke-width="4" className="opacity-25"  /><path  fill="currentColor"  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"  /></svg>
) : null}{_loading ? (
  <>Sending...</>
) : <>{resolvedButtonText()}</>}</button></form>
) : null}{_submitted ? (
  <div className="text-center space-y-4"><div className="flex justify-center"><svg  xmlns="http://www.w3.org/2000/svg"  fill="none"  viewBox="0 0 24 24"  stroke="currentColor"  stroke-width="2" className="h-12 w-12 text-green-500"><path  stroke-linecap="round"  stroke-linejoin="round"  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"  /></svg></div><p className="text-sm text-gray-600">{resolvedResponseMessage()}</p></div>
) : null}</div>


);
}




  export default ForgotPassword;


