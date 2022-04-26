import joi from 'joi'
import { Transform } from '../transform-service'

type SchemaFor<T> = {
    [K in keyof T]: joi.Schema
}

export interface JiraConfig {
    userName: string
    userId: string
    apiToken: string,
    host: string,
    statuses: {
        readyForDevelopment: string
        inDevelopment: string
        inPrReview: string
    }
}

export const jiraConfigSchema = joi.object({
    userName: joi.string().required(),
    userId: joi.string().required(),
    apiToken: joi.string().required(),
    host: joi.string().required(),
    statuses: joi.object({
        readyForDevelopment: joi.string().allow(''), // allow empty strings for now, as this is currently unused
        inDevelopment: joi.string().required(),
        inPrReview: joi.string().allow(''), // allow empty strings for now, as this is currently unused
    }),
} as SchemaFor<JiraConfig>)

export const pullRequestTemplateConfigSchema = joi.object({
    replacements: joi.array().required(),
} as SchemaFor<PullRequestTemplateConfig>)

export interface PullRequestTemplateConfig {
    replacements: Transform[]
}

export const pullRequestConfigSchema = joi.object({
    template: pullRequestTemplateConfigSchema,
    editInTerminal: joi.boolean().required(),
} as SchemaFor<PullRequestConfig>)

export interface PullRequestConfig {
    template: PullRequestTemplateConfig
    editInTerminal: boolean
}

export const gitConfigSchema = joi.object({
    possibleBaseBranches: joi.array().required(),
} as SchemaFor<GitConfig>)

export interface GitConfig {
    possibleBaseBranches: string[]
}

export const appConfigSchema = joi.object({
    jira: jiraConfigSchema,
    git: gitConfigSchema,
    pullRequest: pullRequestConfigSchema,
    logOutputEnabled: joi.boolean().required(),
} as SchemaFor<AppConfig>)

export interface AppConfig {
    jira: JiraConfig
    git: GitConfig
    pullRequest: PullRequestConfig
    logOutputEnabled: boolean
}
