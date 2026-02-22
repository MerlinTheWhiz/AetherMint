#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};

#[contracttype]
#[derive(Clone)]
pub struct UserProfile {
    pub owner: Address,
    pub username: String,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
    pub achievements: Vec<u64>,
    pub privacy_level: PrivacyLevel,
}

#[contracttype]
#[derive(Clone)]
pub enum PrivacyLevel {
    Public,
    Private,
    FriendsOnly,
}

#[contracttype]
#[derive(Clone)]
pub enum ProfileKey {
    User(Address),
    Achievement(u64),
    Username(String),
    AchievementByUser(Address, u64),
    UserAchievements(Address),
}

#[contracttype]
#[derive(Clone)]
pub struct Achievement {
    pub id: u64,
    pub user: Address,
    pub title: String,
    pub description: String,
    pub earned_at: u64,
    pub badge_url: Option<String>,
    pub verified: bool,
}

#[contract]
pub struct UserProfileContract;

#[contractimpl]
impl UserProfileContract {
    /// Initialize the contract
    pub fn initialize(_env: Env) {
        // Contract initialization logic can be added here if needed
    }

    /// Create or update a user profile
    pub fn create_or_update_profile(
        env: Env,
        owner: Address,
        username: String,
        email: Option<String>,
        bio: Option<String>,
        avatar_url: Option<String>,
        privacy_level: PrivacyLevel,
    ) -> UserProfile {
        owner.require_auth();

        // Check if username is already taken by another user
        if let Some(existing_owner) = env.storage().instance().get::<_, Address>(&ProfileKey::Username(username.clone())) {
            if existing_owner != owner {
                panic!("Username already taken");
            }
        }

        let profile = if let Some(mut existing_profile) = env.storage().instance().get::<_, UserProfile>(&ProfileKey::User(owner.clone())) {
            // Update existing profile
            existing_profile.username = username.clone();
            existing_profile.email = email;
            existing_profile.bio = bio;
            existing_profile.avatar_url = avatar_url;
            existing_profile.updated_at = env.ledger().timestamp();
            existing_profile.privacy_level = privacy_level;
            
            existing_profile
        } else {
            // Create new profile
            UserProfile {
                owner: owner.clone(),
                username: username.clone(),
                email,
                bio,
                avatar_url,
                created_at: env.ledger().timestamp(),
                updated_at: env.ledger().timestamp(),
                achievements: Vec::new(&env),
                privacy_level,
            }
        };

        // Store the profile
        env.storage().instance().set(&ProfileKey::User(owner.clone()), &profile);
        // Store username mapping for uniqueness check
        env.storage().instance().set(&ProfileKey::Username(username), &owner);

        // Emit event for profile update
        env.events()
            .publish((symbol_short!("profile"), symbol_short!("updated")), (&owner,));

        profile
    }

    /// Get user profile by address
    pub fn get_profile(env: Env, user: Address) -> Option<UserProfile> {
        env.storage().instance().get(&ProfileKey::User(user))
    }

    /// Get user profile by username
    pub fn get_profile_by_username(env: Env, username: String) -> Option<UserProfile> {
        if let Some(owner) = env.storage().instance().get::<_, Address>(&ProfileKey::Username(username)) {
            env.storage().instance().get(&ProfileKey::User(owner))
        } else {
            None
        }
    }

    /// Add an achievement to a user
    pub fn add_achievement(
        env: Env,
        user: Address,
        title: String,
        description: String,
        badge_url: Option<String>,
    ) -> u64 {
        user.require_auth();

        let achievement_id = Self::get_next_achievement_id(&env);

        // Create achievement
        let achievement = Achievement {
            id: achievement_id,
            user: user.clone(),
            title,
            description,
            earned_at: env.ledger().timestamp(),
            badge_url,
            verified: false,
        };

        // Store the achievement
        env.storage().instance().set(&ProfileKey::Achievement(achievement_id), &achievement);
        env.storage().instance().set(&ProfileKey::AchievementByUser(user.clone(), achievement_id), &());

        // Add to user's achievements list
        let mut profile = env.storage().instance()
            .get::<_, UserProfile>(&ProfileKey::User(user.clone()))
            .unwrap_or_else(|| panic!("Profile not found for user"));
        
        profile.achievements.push_back(achievement_id);
        profile.updated_at = env.ledger().timestamp();
        
        env.storage().instance().set(&ProfileKey::User(user.clone()), &profile);

        // Also store the user's achievement list separately for easier access
        let mut user_achievements: Vec<u64> = env.storage().instance()
            .get(&ProfileKey::UserAchievements(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_achievements.push_back(achievement_id);
        env.storage().instance().set(&ProfileKey::UserAchievements(user.clone()), &user_achievements);

        // Emit event for achievement earned
        env.events()
            .publish((symbol_short!("ach"), symbol_short!("earn")), (user, achievement_id));

        achievement_id
    }

    /// Get achievement by ID
    pub fn get_achievement(env: Env, achievement_id: u64) -> Option<Achievement> {
        env.storage().instance().get(&ProfileKey::Achievement(achievement_id))
    }

    /// Get all achievements for a user
    pub fn get_user_achievements(env: Env, user: Address) -> Vec<Achievement> {
        let mut achievements = Vec::new(&env);
        
        let user_achievements: Vec<u64> = env.storage().instance()
            .get(&ProfileKey::UserAchievements(user))
            .unwrap_or_else(|| Vec::new(&env));
        
        for achievement_id in user_achievements.iter() {
            if let Some(achievement) = Self::get_achievement(env.clone(), achievement_id) {
                achievements.push_back(achievement);
            }
        }
        
        achievements
    }

    /// Verify an achievement (typically done by admin or authorized entity)
    pub fn verify_achievement(env: Env, admin: Address, achievement_id: u64) -> bool {
        admin.require_auth();

        let mut achievement = env.storage().instance()
            .get::<_, Achievement>(&ProfileKey::Achievement(achievement_id))
            .unwrap_or_else(|| panic!("Achievement not found"));

        achievement.verified = true;
        env.storage().instance().set(&ProfileKey::Achievement(achievement_id), &achievement);

        // Emit event for verification
        env.events()
            .publish((symbol_short!("ach"), symbol_short!("ver")), (achievement_id,));

        true
    }

    /// Check if profile is authentic by verifying it exists and has proper data
    pub fn verify_profile_authenticity(env: Env, user: Address) -> bool {
        if let Some(profile) = env.storage().instance().get::<_, UserProfile>(&ProfileKey::User(user)) {
            // Perform basic checks for authenticity
            // Here we just check that the profile exists and has a username
            profile.username.len() > 0
        } else {
            false
        }
    }

    /// Get next achievement ID
    fn get_next_achievement_id(env: &Env) -> u64 {
        let current_id: u64 = env.storage().instance()
            .get(&symbol_short!("nxt_ach"))
            .unwrap_or(0);
        
        let next_id = current_id + 1;
        env.storage().instance().set(&symbol_short!("nxt_ach"), &next_id);
        
        next_id
    }

    /// Update privacy level for a profile
    pub fn update_privacy_level(env: Env, user: Address, privacy_level: PrivacyLevel) -> bool {
        user.require_auth();

        let mut profile = env.storage().instance()
            .get::<_, UserProfile>(&ProfileKey::User(user.clone()))
            .unwrap_or_else(|| panic!("Profile not found"));
        
        profile.privacy_level = privacy_level;
        profile.updated_at = env.ledger().timestamp();
        
        env.storage().instance().set(&ProfileKey::User(user), &profile);

        true
    }

    /// Get profile with privacy check
    pub fn get_profile_with_privacy_check(env: Env, requester: Address, target_user: Address) -> Option<UserProfile> {
        if let Some(profile) = env.storage().instance().get::<_, UserProfile>(&ProfileKey::User(target_user.clone())) {
            match profile.privacy_level {
                PrivacyLevel::Public => Some(profile),
                PrivacyLevel::Private => {
                    if requester == target_user.clone() {
                        Some(profile)
                    } else {
                        None
                    }
                },
                PrivacyLevel::FriendsOnly => {
                    // In a real implementation, this would check friendship status
                    // For now, we'll allow access only to the profile owner
                    if requester == target_user.clone() {
                        Some(profile)
                    } else {
                        None
                    }
                }
            }
        } else {
            None
        }
    }
}