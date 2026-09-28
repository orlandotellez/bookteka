use std::env::var;

use once_cell::sync::Lazy;

pub static PORT: Lazy<String> = Lazy::new(|| var("PORT").expect("PORT not be defined"));

pub static DATABASE_URL: Lazy<String> =
    Lazy::new(|| var("DATABASE_URL").expect("DATABASE_URL not be defined"));

pub static FRONTEND_URL: Lazy<String> =
    Lazy::new(|| var("FRONTEND_URL").expect("FRONTEND_URL not be defined"));

pub static BETTER_AUTH_SECRET: Lazy<String> =
    Lazy::new(|| var("BETTER_AUTH_SECRET").expect("BETTER_AUTH_SECRET not be defined"));

pub static BETTER_AUTH_URL: Lazy<String> =
    Lazy::new(|| var("BETTER_AUTH_URL").expect("BETTER_AUTH_URL not be defined"));
