Bernoulli Bandits: Technical Documentation
Overview

This module provides a minimal infrastructure for Bernoulli bandits. It supports generating and updating a win probability per stock symbol and executing single Bernoulli pulls. It is intended for simple simulations in a multi armed bandit setting and as a utility for higher level algorithms.

Exported API

bernoulli_bandits: Array<{ aktie: string, p_gewinn: number }>

generate_bernoulli_bandit(aktie: string): { aktie: string, p_gewinn: number }

bernoulli_zuege: Array<{ aktie: string, zug: number, gewonnen: boolean }>

fuehre_bernoulli_zug_aus(aktie: string, bernoulliArray: Array<{ aktie: string, p_gewinn: number }>): { aktie: string, zug: number, gewonnen: boolean }

Data Structures
Entry in bernoulli_bandits
type BanditEntry = {
  aktie: string;      // stock symbol or name
  p_gewinn: number;   // win probability in [0, 1]
};

Entry in bernoulli_zuege
type PullEntry = {
  aktie: string;      // stock pulled
  zug: number;        // global consecutive pull number
  gewonnen: boolean;  // Bernoulli outcome
};

Functions
generate_bernoulli_bandit(aktie)

Creates or updates a Bernoulli bandit entry for the given stock.

Parameters

aktie non empty string with the stock name

Logic

Draw p_gewinn = Math.random() * 0.98 + 0.01 which lies in the open interval (0.01, 0.99).

Replace existing entry for aktie or push a new one.

Return the entry.

Returns

{ aktie, p_gewinn }

Side effects

Writes to the global array bernoulli_bandits.

Example

import { bernoulli_bandits, generate_bernoulli_bandit } from './bernoulli.js';
generate_bernoulli_bandit('AAPL');

fuehre_bernoulli_zug_aus(aktie, bernoulliArray)

Executes a single Bernoulli pull for the given stock using probabilities from bernoulliArray (typically bernoulli_bandits).

Parameters

aktie non empty string with the stock name

bernoulliArray array of { aktie, p_gewinn }

Validation

Throws Error if aktie is not a non empty string

Throws Error if bernoulliArray is not an array

Throws Error if no entry for aktie exists

Logic

Find { p_gewinn } for aktie.

Draw u = Math.random().

Set gewonnen = u <= p_gewinn.

Set zug = bernoulli_zuege.length + 1.

Append { aktie, zug, gewonnen } to bernoulli_zuege and return it.

Returns

{ aktie, zug, gewonnen }

Algorithmic Details

Outcome model per pull: Bernoulli with parameter p_gewinn

Global pull numbering across all stocks

generate_bernoulli_bandit replaces an existing probability for a stock

Complexity

generate_bernoulli_bandit: O(n) search then O(1) update or insert

fuehre_bernoulli_zug_aus: O(n) search then O(1) append

Error Messages

Parameter 'aktie' muss eine nichtleere Zeichenkette sein.

Parameter 'bernoulliArray' muss ein Array sein.

Keine Gewinnwahrscheinlichkeit für Aktie '<name>' gefunden.

Randomness and Reproducibility

Uses Math.random. For reproducibility inject a seeded PRNG or mock Math.random in tests.

State Management

bernoulli_bandits and bernoulli_zuege are module level mutable arrays

For isolated simulations keep separate arrays and pass them explicitly

Gaussian Bandits: Technical Documentation
Overview

This module provides utilities for Gaussian bandits. It lets you generate or overwrite Gaussian bandit parameters per stock and execute single pulls that sample from a normal distribution. It is intended for simulations in a multi armed bandit setting or as a building block for higher level algorithms.

Installation
npm i d3-random

Exported API

gaussian_banditen: Array<{ aktie: string, investitionsvolumen: number, mu: number, sigma: number }>

gaussian_zuege: Array<{ aktie: string, zug: number, wert: number, mu: number, sigma: number }>

generiere_gaussian_bandit(aktie: string, investitionsvolumen: number): { aktie: string, investitionsvolumen: number, mu: number, sigma: number }

fuehre_gaussian_zug_aus(aktie: string, banditArray?: Array<{ aktie: string, investitionsvolumen: number, mu: number, sigma: number }>): { aktie: string, zug: number, wert: number, mu: number, sigma: number }

Data Structures
Entry in gaussian_banditen
type GaussianBandit = {
  aktie: string;
  investitionsvolumen: number;
  mu: number;
  sigma: number;
};

Entry in gaussian_zuege
type GaussianZug = {
  aktie: string;
  zug: number;
  wert: number;
  mu: number;
  sigma: number;
};

Functions
generiere_gaussian_bandit(aktie, investitionsvolumen)

Creates or overwrites a Gaussian bandit entry for the given stock.

Parameters

aktie non empty string with the stock name

investitionsvolumen positive number

Validation

Throws Error if aktie is not a non empty string

Throws Error if investitionsvolumen is not a positive finite number

Logic

Convert investitionsvolumen to vol.

Draw mu uniformly in [0.9 * vol, 1.1 * vol].

Set sigma = 0.10 * vol.

Create { aktie, investitionsvolumen: vol, mu, sigma }.

Replace existing entry for aktie or push a new one.

Return the entry.

Returns

{ aktie, investitionsvolumen, mu, sigma }

Side effects

Writes to gaussian_banditen.

fuehre_gaussian_zug_aus(aktie, banditArray = gaussian_banditen)

Draws a single sample from N(mu, sigma^2) for the specified stock.

Parameters

aktie non empty string with the stock name

banditArray optional array of Gaussian bandit entries

Validation

Throws Error if aktie is not a non empty string

Throws Error if banditArray is not an array

Throws Error if no entry for aktie exists

Logic

Find { mu, sigma } for aktie.

Create a sampler with randomNormal(mu, sigma) from d3-random.

Sample wert = sampler().

Set zug = gaussian_zuege.length + 1.

Append { aktie, zug, wert, mu, sigma } to gaussian_zuege and return it.

Returns

{ aktie, zug, wert, mu, sigma }

Algorithmic Details

Outcome model per pull: normal distribution with mean mu and standard deviation sigma

Parameter generation: mu within a band around the volume, sigma fixed at 10 percent of the volume

Global pull numbering across all stocks

Repeated generation for the same stock overwrites parameters

Complexity

generiere_gaussian_bandit: O(n) search then O(1) update or insert

fuehre_gaussian_zug_aus: O(n) search then O(1) append

Error Messages

Parameter 'aktie' muss eine nichtleere Zeichenkette sein.

Parameter 'investitionsvolumen' muss eine positive Zahl sein.

Parameter 'banditArray' muss ein Array sein.

Keine Parameter für Gaussian Bandit der Aktie '<name>' gefunden.

Randomness and Reproducibility

Sampling uses d3-random. For reproducibility inject a seeded PRNG or mock randomNormal and Math.random in tests.

State Management

gaussian_banditen and gaussian_zuege are module level mutable arrays

For isolated simulations maintain separate arrays and pass them explicitly