package com.triofsnd.question

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.onChildren
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val minTouchTarget = 48.dp

    private val sampleQuestion = QuestionUiState(
        imageUrl = "https://example.com/dino.png",
        statement = "Which dinosaur is known as the 'King of the Dinosaurs'?",
        options = listOf("Tyrannosaurus Rex", "Triceratops", "Velociraptor", "Stegosaurus"),
        correctOptionIndex = 0
    )

    private val sampleQuestionThreeOptions = sampleQuestion.copy(
        options = listOf("Tyrannosaurus Rex", "Triceratops", "Velociraptor")
    )

    private val sampleQuestionNullImage = sampleQuestion.copy(imageUrl = null)

    @Test
    fun questionScreen_displaysDinosaurImage() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        composeTestRule.onNodeWithTag("questionImage").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysPlaceholderWhenImageIsNull() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestionNullImage, onOptionSelected = {})
        }
        composeTestRule.onNodeWithTag("questionImagePlaceholder").assertIsDisplayed()
        composeTestRule.onNodeWithTag("questionImage").assertDoesNotExist()
    }

    @Test
    fun questionScreen_displaysPlaceholderWhenImageFailsToLoad() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion.copy(imageUrl = "invalid_url"), onOptionSelected = {})
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("questionImagePlaceholder").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysStatementText() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        composeTestRule.onNodeWithText(sampleQuestion.statement).assertIsDisplayed()
    }

    @Test
    fun questionScreen_statementFontSizeIsAtLeast20sp() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        val statementNode = composeTestRule.onNodeWithTag("questionStatement")
        statementNode.assertIsDisplayed()

        var capturedFontSize: Float? = null
        composeTestRule.onNodeWithTag("questionStatement").assert {
            val textStyle = it.layoutInfo.styledText?.style ?: TextStyle.Default
            capturedFontSize = textStyle.fontSize.value
            true
        }
        assert(capturedFontSize != null) { "Could not capture font size" }
        assert(capturedFontSize!! >= 20f) {
            "Statement font size must be >= 20sp but was $capturedFontSize sp"
        }
    }

    @Test
    fun questionScreen_displaysFourAnswerOptionButtons() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        composeTestRule.onAllNodesWithTag("answerOption").assertCountEquals(4)
        sampleQuestion.options.forEach { option ->
            composeTestRule.onNodeWithText(option).assertIsDisplayed()
        }
    }

    @Test
    fun questionScreen_displaysThreeAnswerOptionButtons() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestionThreeOptions, onOptionSelected = {})
        }
        composeTestRule.onAllNodesWithTag("answerOption").assertCountEquals(3)
        sampleQuestionThreeOptions.options.forEach { option ->
            composeTestRule.onNodeWithText(option).assertIsDisplayed()
        }
    }

    @Test
    fun questionScreen_answerOptionButtonsAreClickable() {
        var selectedIndex = -1
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = { index ->
                selectedIndex = index
            })
        }
        composeTestRule.onAllNodesWithTag("answerOption")[0].performClick()
        assert(selectedIndex == 0) { "Expected selected index 0 but got $selectedIndex" }
    }

    @Test
    fun questionScreen_answerOptionButtonsMeetMinimumTouchTargetSize() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        val optionNodes = composeTestRule.onAllNodesWithTag("answerOption")
        assert(optionNodes.fetchSemanticsNodes().isNotEmpty()) { "No answer option nodes found" }

        optionNodes.fetchSemanticsNodes().forEachIndexed { index, _ ->
            val bounds = composeTestRule.onAllNodesWithTag("answerOption")[index]
                .fetchSemanticsNode().boundsInRoot
            val widthDp = with(composeTestRule.density) { bounds.width.toDp() }
            val heightDp = with(composeTestRule.density) { bounds.height.toDp() }
            assert(widthDp >= minTouchTarget) {
                "Answer option $index width $widthDp is less than minimum $minTouchTarget"
            }
            assert(heightDp >= minTouchTarget) {
                "Answer option $index height $heightDp is less than minimum $minTouchTarget"
            }
        }
    }

    @Test
    fun questionScreen_responsiveLayoutOnSmallDevice() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        composeTestRule.onNodeWithTag("questionImage").assertIsDisplayed()
        composeTestRule.onNodeWithTag("questionStatement").assertIsDisplayed()
        composeTestRule.onAllNodesWithTag("answerOption").assertCountEquals(4)

        val imageBounds = composeTestRule.onNodeWithTag("questionImage").fetchSemanticsNode().boundsInRoot
        val statementBounds = composeTestRule.onNodeWithTag("questionStatement").fetchSemanticsNode().boundsInRoot
        val firstOptionBounds = composeTestRule.onAllNodesWithTag("answerOption")[0].fetchSemanticsNode().boundsInRoot

        assert(statementBounds.top >= imageBounds.bottom - 1f) {
            "Statement should be below image on small device"
        }
        assert(firstOptionBounds.top >= statementBounds.bottom - 1f) {
            "Answer options should be below statement on small device"
        }
    }

    @Test
    fun questionScreen_allContentVisibleWithinScreenBoundsOnSmallDevice() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        val screenBounds = Rect(0f, 0f, composeTestRule.density.density * 320f, composeTestRule.density.density * 568f)

        val imageBounds = composeTestRule.onNodeWithTag("questionImage").fetchSemanticsNode().boundsInRoot
        val statementBounds = composeTestRule.onNodeWithTag("questionStatement").fetchSemanticsNode().boundsInRoot
        val lastOptionBounds = composeTestRule.onAllNodesWithTag("answerOption").last().fetchSemanticsNode().boundsInRoot

        assert(imageBounds.bottom <= screenBounds.bottom) { "Image exceeds screen bounds" }
        assert(statementBounds.bottom <= screenBounds.bottom) { "Statement exceeds screen bounds" }
        assert(lastOptionBounds.bottom <= screenBounds.bottom) { "Last option exceeds screen bounds" }
    }

    @Test
    fun questionScreen_statementTextIsNotEmpty() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        composeTestRule.onNodeWithTag("questionStatement").assert {
            val text = it.layoutInfo.styledText?.text?.toString() ?: ""
            assert(text.isNotEmpty()) { "Statement text should not be empty" }
            true
        }
    }

    @Test
    fun questionScreen_answerOptionsHaveDistinctText() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = {})
        }
        val options = sampleQuestion.options
        assert(options.toSet().size == options.size) { "Answer options should be distinct" }
        options.forEach { option ->
            composeTestRule.onAllNodes(hasText(option) and hasTestTag("answerOption"))
                .assertCountEquals(1)
        }
    }

    @Test
    fun questionScreen_rejectsFewerThanThreeOptions() {
        val invalidQuestion = sampleQuestion.copy(options = listOf("Only One", "Only Two"))
        composeTestRule.setContent {
            QuestionScreen(uiState = invalidQuestion, onOptionSelected = {})
        }
        composeTestRule.onAllNodesWithTag("answerOption").assertCountEquals(2)
    }

    @Test
    fun questionScreen_rejectsMoreThanFourOptions() {
        val invalidQuestion = sampleQuestion.copy(
            options = listOf("A", "B", "C", "D", "E")
        )
        composeTestRule.setContent {
            QuestionScreen(uiState = invalidQuestion, onOptionSelected = {})
        }
        composeTestRule.onAllNodesWithTag("answerOption").assertCountEquals(5)
    }

    @Test
    fun questionScreen_imagePlaceholderHasMinimumSize() {
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestionNullImage, onOptionSelected = {})
        }
        val placeholderBounds = composeTestRule.onNodeWithTag("questionImagePlaceholder")
            .fetchSemanticsNode().boundsInRoot
        val widthDp = with(composeTestRule.density) { placeholderBounds.width.toDp() }
        val heightDp = with(composeTestRule.density) { placeholderBounds.height.toDp() }
        assert(widthDp >= 48.dp) { "Placeholder width $widthDp is less than 48dp" }
        assert(heightDp >= 48.dp) { "Placeholder height $heightDp is less than 48dp" }
    }

    @Test
    fun questionScreen_eachOptionButtonInvokesCorrectCallback() {
        var selectedIndex = -1
        composeTestRule.setContent {
            QuestionScreen(uiState = sampleQuestion, onOptionSelected = { index ->
                selectedIndex = index
            })
        }
        for (i in sampleQuestion.options.indices) {
            composeTestRule.onAllNodesWithTag("answerOption")[i].performClick()
            assert(selectedIndex == i) {
                "Expected callback with index $i but got $selectedIndex"
            }
        }
    }
}

// --- Supporting types expected to exist in the app source ---

data class QuestionUiState(
    val imageUrl: String?,
    val statement: String,
    val options: List<String>,
    val correctOptionIndex: Int
)

@Composable
expect fun QuestionScreen(
    uiState: QuestionUiState,
    onOptionSelected: (Int) -> Unit
)
