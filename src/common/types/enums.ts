export enum ValidationDataSource {
    Query,
    Headers,
    Body
}

export enum Auth0Permissions {
    ReadAuth0Users = 'read:auth0_users',
    ReadAuth0UserRoles = 'read:auth0_user_roles',
    ReadAuth0UserPermissions = 'read:auth0_user_permissions',
    ReadAuth0Roles = 'read:auth0_roles',
    CreateAuth0UserRoles = 'create:auth0_user_roles',
    DeleteAuth0UserRoles = 'delete:auth0_user_roles'
}

export enum ProjectMemberRole {
    Contributor = 1000,
    Developer = 2000,
    Admin = 3000,
    Creator = 4000
}

export enum WorkStatus {
    NotStarted = 'not_started',
    InProgress = 'in_progress',
    Done = 'done',
    InQA = 'in_qa',
    InUAT = 'in_uat',
    MoreWorkIsNeeded = 'more_work_is_needed',
    Accepted = 'accepted'
}

export enum UserStatistic {
    ActiveTasksStat = 'activeTasksStat',
    AcceptedTasksStat = 'acceptedTasksStat',
    CreatedProjectsStat = 'createdProjectsStat',
    ExternalCollaborationsStat = 'externalCollaborationsStat',
}

export enum ProjectStatistic {
    MembersStat = 'membersStat',
    AttachmentsStat = 'attachmentsStat',
    ActiveTasksStat = 'activeTasksStat',
    AcceptedTasksStat = 'acceptedTasksStat',
    AvailableTasksStat = 'availableTasksStat',
}
