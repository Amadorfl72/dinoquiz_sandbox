package com.triofsnd.question

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.toSet
import androidx.compose.ui.test.SemanticsMatcher
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenAccessibilityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val sampleQuestion = QuestionUiState(
        imageUrl = "https://example.com/dino.png",
        statement = "Which dinosaur is known as the 'King of the Dinosaurs'?",
        options = listOf("Tyrannosaurus Rex", "Triceratops", "Velociraptor", "Stegosaurus"),
        correctOptionIndex = 0
    )

    @Test
    fun answerOptionButtonsHaveButtonRole() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        val optionNodes = composeTestRule.onAllNodesWithTag("answerOption")
        optionNodes.assertCountEquals(4)
        optionNodes.fetchSemanticsNodes().forEach { node ->
            val roles = node.config.toSet()
            assert(roles.any { it == SemanticsProperties.Role }) {
                "Answer option must have a Role semantics property"
            }
            val role = node.config[SemanticsProperties.Role]
            assert(role == Role.Button) {
                "Answer option must have Role.Button but was $role"
            }
        }
    }

    @Test
    fun questionImageHasContentDescription() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        composeTestRule.onNodeWithTag("questionImage").assert {
            val desc = it.config.getOrNull(SemanticsProperties.ContentDescription)
            assert(desc != null && desc.isNotEmpty()) {
                "Question image must have a content description for accessibility"
            }
            true
        }
    }

    @Test
    fun questionImagePlaceholderHasContentDescription() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion.copy(imageUrl = null), onOptionSelected = {})
        }
        composeTestRule.onNodeWithTag("questionImagePlaceholder").assert {
            val desc = it.config.getOrNull(SemanticsProperties.ContentDescription)
            assert(desc != null && desc.isNotEmpty()) {
                "Question image placeholder must have a content description for accessibility"
            }
            true
        }
    }

    @Test
    fun answerOptionButtonsAreFocusable() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        val optionNodes = composeTestRule.onAllNodesWithTag("answerOption")
        optionNodes.fetchSemanticsNodes().forEach { node ->
            assert(node.config.contains(SemanticsProperties.IsFocusable)) {
                "Answer option must be focusable for keyboard navigation"
            }
        }
    }
}
